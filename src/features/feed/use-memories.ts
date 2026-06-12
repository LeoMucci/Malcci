// Hook de dados do feed de memórias: carregamento com joins, fallback para mock,
// mutações (reação, favorito, comentário, criar/editar/apagar) e realtime.

import { useCallback, useEffect, useRef, useState } from 'react';
import { FEED } from '@/constants/data';
import { useAuth } from '@/hooks/use-auth';
import { useRealtimeRefresh } from '@/hooks/use-realtime';
import { useToast } from '@/components/ui/toast';
import { getErrorMessage } from '@/lib/errors';
import { isFavoritedBy, summarizeReactions, type ReactionSummary } from '@/lib/mappers';
import { sendNotification } from '@/lib/notifications';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { cleanText, isNonEmpty, LIMITS } from '@/lib/validation';
import type { MemoryCommentRow, MemoryPhotoRow, MemoryRow } from '@/types/domain';
import { insertMemorySpotify, loadMemoryRows, syncMemoryPhotos } from './feed-api';
import { uploadPickedPhoto } from './upload-photo';
import type { MemoryCommentView, MemoryFormValues, MemoryId, MemoryView } from './types';

const FEED_TABLES = ['memories', 'memory_reactions', 'memory_comments', 'favorites', 'memory_spotify', 'memory_photos'] as const;

function formatMemoryDate(createdAt: string): string {
  return new Date(createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function deriveTag(row: MemoryRow): string {
  if (row.type === 'movie') return 'assistido';
  if (row.rating === 5) return '5 estrelas';
  if (row.type === 'place') return 'lugar';
  if (row.type === 'passeio') return 'passeio';
  if (row.type === 'date') return 'encontro';
  if (row.type === 'restaurant') return 'restaurante';
  if (row.type === 'shopping') return 'compra';
  if (row.type === 'travel') return 'viagem';
  return 'momento';
}

function toCommentView(comment: MemoryCommentRow): MemoryCommentView {
  return {
    who: comment.author?.display_name || 'Alguém',
    text: comment.content,
    authorAvatarUrl: comment.author?.avatar_url || null,
  };
}

/** Lista ordenada de fotos: usa memory_photos se houver, senão a capa única. */
function buildPhotoList(row: MemoryRow): string[] {
  const fromTable = (row.photos ?? [])
    .slice()
    .sort((a: MemoryPhotoRow, b: MemoryPhotoRow) => a.position - b.position)
    .map(p => p.photo_url)
    .filter(Boolean);
  if (fromTable.length > 0) return fromTable;
  return row.photo_url ? [row.photo_url] : [];
}

function toMemoryView(row: MemoryRow, currentUserId: number): MemoryView {
  // PostgREST devolve memory_spotify como objeto único (1-para-1) ou array — normaliza.
  const spotifyRow = Array.isArray(row.spotify) ? (row.spotify[0] ?? null) : (row.spotify ?? null);
  const photos = buildPhotoList(row);
  return {
    id: row.id,
    cat: row.type,
    tag: deriveTag(row),
    title: row.title,
    date: formatMemoryDate(row.created_at),
    by: row.author?.display_name || 'Parceiro',
    byAvatarUrl: row.author?.avatar_url || null,
    loc: row.location,
    desc: row.description || '',
    stars: row.rating || 0,
    fav: isFavoritedBy(row.favorites, currentUserId),
    photoUrl: photos[0] ?? null,
    photos,
    reactions: summarizeReactions(row.reactions, currentUserId),
    spotify: spotifyRow
      ? {
          track: spotifyRow.track_name,
          artist: spotifyRow.artist,
          previewUrl: spotifyRow.preview_url ?? null,
          albumArt: spotifyRow.album_url ?? null,
        }
      : null,
    comments: (row.comments ?? []).map(toCommentView),
    createdAt: row.created_at,
  };
}

function parseMockDate(id: string): string {
  if (id === 'm1') return '2026-06-01T12:00:00.000Z';
  if (id === 'm2') return '2026-05-28T12:00:00.000Z';
  if (id === 'm3') return '2025-07-14T12:00:00.000Z';
  return '2025-02-14T12:00:00.000Z';
}

function buildMockMemories(): MemoryView[] {
  return FEED.map(m => ({
    id: m.id,
    cat: m.cat,
    tag: m.tag,
    title: m.title,
    date: m.date,
    by: m.by,
    loc: m.loc,
    desc: m.desc,
    stars: m.stars,
    fav: m.fav,
    photoUrl: null,
    photos: [],
    reactions: m.reactions.map(r => ({ emoji: r.e, count: r.n, mine: r.mine })),
    spotify: m.spotify ? { track: m.spotify.track, artist: m.spotify.artist, previewUrl: null, albumArt: null } : null,
    comments: m.comments,
    createdAt: parseMockDate(String(m.id)),
  }));
}

function sortMemories(list: MemoryView[]): MemoryView[] {
  return list.slice().sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeB - timeA;
  });
}

/** Aplica um toggle de reação localmente (atualização otimista). */
function applyReactionToggle(reactions: ReactionSummary[], emoji: string): ReactionSummary[] {
  const existing = reactions.find(r => r.emoji === emoji);
  if (!existing) return [...reactions, { emoji, count: 1, mine: true }];
  if (existing.mine) {
    if (existing.count <= 1) return reactions.filter(r => r.emoji !== emoji);
    return reactions.map(r => (r.emoji === emoji ? { ...r, count: r.count - 1, mine: false } : r));
  }
  return reactions.map(r => (r.emoji === emoji ? { ...r, count: r.count + 1, mine: true } : r));
}

export function useMemories() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [memories, setMemories] = useState<MemoryView[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const userId = user?.id ?? null;
  const memoriesRef = useRef<MemoryView[]>([]);
  memoriesRef.current = memories;

  const reload = useCallback(async () => {
    setLoading(true);
    if (!isSupabaseConfigured) {
      setMemories(sortMemories(buildMockMemories()));
      setLoading(false);
      return;
    }
    try {
      const rows = await loadMemoryRows();
      const mapped = rows.map(row => toMemoryView(row, userId ?? -1));
      setMemories(sortMemories(mapped));
    } catch (err) {
      console.error('Failed to load memories from Supabase:', err);
      setMemories(prev => (prev.length > 0 ? prev : sortMemories(buildMockMemories())));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useRealtimeRefresh(FEED_TABLES, reload);

  const toggleReaction = useCallback(async (memoryId: MemoryId, emoji: string) => {
    const memoryTitle = memoriesRef.current.find(m => m.id === memoryId)?.title || 'uma lembrança';
    setMemories(prev => prev.map(m => (
      m.id === memoryId ? { ...m, reactions: applyReactionToggle(m.reactions, emoji) } : m
    )));
    if (!user || !isSupabaseConfigured) return;

    try {
      const { data, error } = await supabase
        .from('memory_reactions')
        .select('id')
        .eq('memory_id', memoryId)
        .eq('user_id', user.id)
        .eq('emoji', emoji);
      if (error) throw error;

      const existing = (data ?? []) as Array<{ id: number }>;
      if (existing.length > 0) {
        const { error: deleteError } = await supabase.from('memory_reactions').delete().eq('id', existing[0].id);
        if (deleteError) throw deleteError;
      } else {
        const { error: insertError } = await supabase
          .from('memory_reactions')
          .insert({ memory_id: memoryId, user_id: user.id, emoji });
        if (insertError) throw insertError;
        await sendNotification(user.id, 'new_comment', `${user.displayName} reagiu com ${emoji}!`, `Em "${memoryTitle}"`);
      }
      await reload();
    } catch (err) {
      showToast(getErrorMessage(err, 'Não foi possível registrar a reação.'), 'error');
      await reload();
    }
  }, [user, reload, showToast]);

  const toggleFavorite = useCallback(async (memoryId: MemoryId, currentFav: boolean) => {
    setMemories(prev => prev.map(m => (m.id === memoryId ? { ...m, fav: !m.fav } : m)));
    if (!user || !isSupabaseConfigured) return;

    try {
      if (currentFav) {
        const { error } = await supabase.from('favorites').delete().eq('memory_id', memoryId).eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('favorites').insert({ memory_id: memoryId, user_id: user.id });
        if (error) throw error;
      }
      await reload();
    } catch (err) {
      showToast(getErrorMessage(err, 'Não foi possível atualizar a favorita.'), 'error');
      await reload();
    }
  }, [user, reload, showToast]);

  // Apaga direto — a confirmação acontece na UI (o menu do card). Alert.alert
  // não renderiza botões na web, então não dá pra confiar nele para confirmar.
  const deleteMemory = useCallback(async (memoryId: MemoryId) => {
    if (!isSupabaseConfigured) {
      setMemories(prev => prev.filter(m => m.id !== memoryId));
      showToast('Memória apagada.', 'success');
      return;
    }
    try {
      const { error } = await supabase.from('memories').delete().eq('id', memoryId);
      if (error) throw error;
      showToast('Memória apagada.', 'success');
      await reload();
    } catch (err) {
      showToast(getErrorMessage(err, 'Não foi possível apagar a memória.'), 'error');
    }
  }, [reload, showToast]);

  const saveMemory = useCallback(async (values: MemoryFormValues, editingId: MemoryId | null): Promise<boolean> => {
    if (!user) return false;

    const title = cleanText(values.title, LIMITS.title);
    if (!isNonEmpty(title)) {
      showToast('Dê um título para a memória.', 'error');
      return false;
    }
    const description = cleanText(values.description, LIMITS.description);
    const location = cleanText(values.location, LIMITS.location);
    const track = values.spotifyTrack.trim();
    const artist = values.spotifyArtist.trim();
    const hasSpotify = isNonEmpty(track) && isNonEmpty(artist);
    const hasRating = values.type === 'restaurant' || values.type === 'movie';

    setSaving(true);
    try {
      if (!isSupabaseConfigured) {
        const localPhotos = [...values.photoUrls, ...values.pickedPhotos.map(p => p.uri)];
        const mockSpotify = hasSpotify
          ? { track, artist, previewUrl: values.spotifyPreviewUrl || null, albumArt: values.spotifyAlbumArt || null }
          : null;
        const formattedDate = formatMemoryDate(new Date(`${values.date}T12:00:00`).toISOString());
        if (editingId) {
          setMemories(prev => sortMemories(prev.map(m => (m.id !== editingId ? m : {
            ...m,
            cat: values.type,
            title,
            loc: location || null,
            desc: description,
            stars: hasRating ? values.rating : 0,
            photoUrl: localPhotos[0] ?? null,
            photos: localPhotos,
            spotify: mockSpotify,
            date: formattedDate,
            createdAt: new Date(`${values.date}T12:00:00`).toISOString(),
          }))));
        } else {
          setMemories(prev => sortMemories([{
            id: `m_${Date.now()}`,
            cat: values.type,
            tag: 'novo',
            title,
            date: formattedDate,
            by: user.displayName,
            loc: location || null,
            desc: description,
            stars: hasRating ? values.rating : 0,
            fav: false,
            photoUrl: localPhotos[0] ?? null,
            photos: localPhotos,
            reactions: [],
            spotify: mockSpotify,
            comments: [],
            createdAt: new Date(`${values.date}T12:00:00`).toISOString(),
          }, ...prev]));
        }
        showToast('Memória salva ✨', 'success');
        return true;
      }

      // Envia as fotos novas e monta a lista final (existentes + enviadas, na ordem).
      const uploaded = await Promise.all(values.pickedPhotos.map(photo => uploadPickedPhoto(photo)));
      const allPhotoUrls = [...values.photoUrls, ...uploaded.map(u => u.url)]
        .map(url => cleanText(url, LIMITS.url))
        .filter(Boolean);
      const cover = allPhotoUrls[0] ?? null;
      const coverKey = uploaded.length > 0 && values.photoUrls.length === 0 ? uploaded[0].key : null;

      const payload = {
        type: values.type,
        title,
        description: description || null,
        location: location || null,
        latitude: values.latitude,
        longitude: values.longitude,
        rating: hasRating ? values.rating : null,
        photo_url: cover,
        photo_key: coverKey,
        created_at: new Date(`${values.date}T12:00:00`).toISOString(),
      };

      let memoryId: number;
      if (editingId) {
        const numericId = Number(editingId);
        const { error } = await supabase.from('memories').update(payload).eq('id', numericId);
        if (error) throw error;
        memoryId = numericId;

        const { error: spotifyDeleteError } = await supabase.from('memory_spotify').delete().eq('memory_id', numericId);
        if (spotifyDeleteError) throw spotifyDeleteError;
      } else {
        const { data, error } = await supabase
          .from('memories')
          .insert({ ...payload, created_by: user.id })
          .select('id');
        if (error) throw error;
        const created = (data ?? []) as Array<{ id: number }>;
        if (created.length === 0) throw new Error('Falha ao criar a memória.');
        memoryId = created[0].id;

        await sendNotification(
          user.id,
          'new_memory',
          `${user.displayName} registrou uma nova lembrança! 📸`,
          `Criou "${title}" em ${location || 'nosso espaço'}.`,
        );
      }

      const photosSynced = await syncMemoryPhotos(memoryId, allPhotoUrls);

      if (hasSpotify) {
        await insertMemorySpotify(memoryId, {
          track,
          artist,
          previewUrl: values.spotifyPreviewUrl,
          albumArt: values.spotifyAlbumArt,
        });
      }

      if (!photosSynced && allPhotoUrls.length > 1) {
        showToast('Memória salva, mas só a capa foi guardada — verifique a tabela memory_photos (migração/RLS).', 'info');
      } else {
        showToast('Memória salva ✨', 'success');
      }
      await reload();
      return true;
    } catch (err) {
      console.error('Failed to save memory:', err);
      showToast(getErrorMessage(err, 'Não foi possível salvar a memória.'), 'error');
      return false;
    } finally {
      setSaving(false);
    }
  }, [user, reload, showToast]);

  const addComment = useCallback(async (memory: MemoryView, rawText: string): Promise<boolean> => {
    if (!user) return false;
    const text = cleanText(rawText, LIMITS.comment);
    if (!isNonEmpty(text)) return false;

    if (!isSupabaseConfigured) {
      setMemories(prev => prev.map(m => (
        m.id === memory.id ? { ...m, comments: [...m.comments, { who: user.displayName, text }] } : m
      )));
      return true;
    }

    try {
      const { error } = await supabase
        .from('memory_comments')
        .insert({ memory_id: memory.id, author_id: user.id, content: text });
      if (error) throw error;

      await sendNotification(
        user.id,
        'new_comment',
        `${user.displayName} comentou em uma memória! 💬`,
        `Comentou em "${memory.title}": "${text}"`,
      );

      const { data, error: fetchError } = await supabase
        .from('memory_comments')
        .select('id, content, author:users(display_name)')
        .eq('memory_id', memory.id);
      if (fetchError) throw fetchError;

      const comments = ((data ?? []) as unknown as MemoryCommentRow[]).map(toCommentView);
      setMemories(prev => prev.map(m => (m.id === memory.id ? { ...m, comments } : m)));
      return true;
    } catch (err) {
      showToast(getErrorMessage(err, 'Não foi possível enviar o comentário.'), 'error');
      return false;
    }
  }, [user, showToast]);

  return {
    memories,
    loading,
    saving,
    isConfigured: isSupabaseConfigured,
    reload,
    toggleReaction,
    toggleFavorite,
    deleteMemory,
    saveMemory,
    addComment,
  };
}
