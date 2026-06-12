// Acesso ao Supabase para o feed. Degrada graciosamente quando as migrações
// (tabela memory_photos, colunas users.avatar_url) ainda não foram aplicadas.

import { supabase } from '@/lib/supabase';
import type { MemoryRow } from '@/types/domain';

// Lembra se as tabelas/colunas estendidas existem, para não repetir tentativas falhas.
let photosTableAvailable: boolean | null = null;
let usersAvatarUrlAvailable: boolean | null = null;

function buildSelectString(): string {
  const authorFields = usersAvatarUrlAvailable !== false ? 'display_name, avatar_url' : 'display_name';
  const authorSelect = `author:users(${authorFields})`;
  const commentsSelect = `comments:memory_comments(id, content, author:users(${authorFields}))`;
  const photosSelect = photosTableAvailable !== false ? ', photos:memory_photos(photo_url, position)' : '';

  return `
    *,
    ${authorSelect},
    ${commentsSelect},
    reactions:memory_reactions(id, emoji, user_id),
    favorites:favorites(user_id),
    spotify:memory_spotify(*)${photosSelect}
  `;
}

/** Carrega as memórias com todos os joins; cai para fallbacks se tabelas ou colunas não existirem. */
export async function loadMemoryRows(): Promise<MemoryRow[]> {
  try {
    const selectStr = buildSelectString();
    const { data, error } = await supabase
      .from('memories')
      .select(selectStr)
      .order('created_at', { ascending: false });

    if (!error) {
      if (photosTableAvailable === null) photosTableAvailable = true;
      if (usersAvatarUrlAvailable === null) usersAvatarUrlAvailable = true;
      return (data ?? []) as unknown as MemoryRow[];
    }

    // Analisa o erro para desativar recursos em falta
    const errMessage = error.message.toLowerCase();

    if (errMessage.includes('memory_photos') && photosTableAvailable !== false) {
      photosTableAvailable = false;
      return loadMemoryRows(); // Tenta novamente sem a tabela de fotos
    }

    if (errMessage.includes('avatar_url') && usersAvatarUrlAvailable !== false) {
      usersAvatarUrlAvailable = false;
      return loadMemoryRows(); // Tenta novamente sem a coluna avatar_url
    }

    throw error;
  } catch (err) {
    console.warn('Erro ao carregar memórias com recursos estendidos, aplicando fallback total:', err);
    photosTableAvailable = false;
    usersAvatarUrlAvailable = false;
    
    const selectStr = buildSelectString();
    const { data, error } = await supabase
      .from('memories')
      .select(selectStr)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as unknown as MemoryRow[];
  }
}

/**
 * Substitui as fotos da memória (apaga as antigas e insere a lista nova, em ordem).
 * Retorna false se a tabela memory_photos não existir (migração pendente).
 */
export async function syncMemoryPhotos(memoryId: number, photoUrls: string[]): Promise<boolean> {
  if (photosTableAvailable === false) return false;
  try {
    const { error: deleteError } = await supabase.from('memory_photos').delete().eq('memory_id', memoryId);
    if (deleteError) throw deleteError;

    if (photoUrls.length > 0) {
      const rows = photoUrls.map((url, index) => ({ memory_id: memoryId, photo_url: url, position: index }));
      const { error: insertError } = await supabase.from('memory_photos').insert(rows);
      if (insertError) throw insertError;
    }
    photosTableAvailable = true;
    return true;
  } catch {
    photosTableAvailable = false;
    return false;
  }
}

export interface SpotifyPayload {
  track: string;
  artist: string;
  previewUrl: string;
  albumArt: string;
}

/** Insere a trilha sonora. */
export async function insertMemorySpotify(memoryId: number, payload: SpotifyPayload): Promise<void> {
  const withPreview = {
    memory_id: memoryId,
    track_name: payload.track,
    artist: payload.artist,
    album_url: payload.albumArt || null,
    preview_url: payload.previewUrl || null,
  };
  const { error } = await supabase.from('memory_spotify').insert(withPreview);
  if (!error) return;

  // preview_url provavelmente não existe (migração pendente) — salva sem a prévia.
  const { error: fallbackError } = await supabase
    .from('memory_spotify')
    .insert({ memory_id: memoryId, track_name: payload.track, artist: payload.artist, album_url: payload.albumArt || null });
  if (fallbackError) throw fallbackError;
}
