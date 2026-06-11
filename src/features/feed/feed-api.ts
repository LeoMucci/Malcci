// Acesso ao Supabase para o feed. Degrada graciosamente quando a migração
// (tabela memory_photos, colunas preview_url/album_art) ainda não foi aplicada:
// nesse caso usa só a capa em memories.photo_url, como antes.

import { supabase } from '@/lib/supabase';
import type { MemoryRow } from '@/types/domain';

const SELECT_WITH_PHOTOS = `
  *,
  author:users(display_name),
  comments:memory_comments(id, content, author:users(display_name)),
  reactions:memory_reactions(id, emoji, user_id),
  favorites:favorites(user_id),
  spotify:memory_spotify(*),
  photos:memory_photos(photo_url, position)
`;

const SELECT_BASE = `
  *,
  author:users(display_name),
  comments:memory_comments(id, content, author:users(display_name)),
  reactions:memory_reactions(id, emoji, user_id),
  favorites:favorites(user_id),
  spotify:memory_spotify(*)
`;

// Lembra se o schema estendido existe, para não repetir a tentativa que falha.
let photosTableAvailable: boolean | null = null;

/** Carrega as memórias com todos os joins; cai para o select base se memory_photos não existir. */
export async function loadMemoryRows(): Promise<MemoryRow[]> {
  if (photosTableAvailable !== false) {
    const { data, error } = await supabase
      .from('memories')
      .select(SELECT_WITH_PHOTOS)
      .order('created_at', { ascending: false });
    if (!error) {
      photosTableAvailable = true;
      return (data ?? []) as unknown as MemoryRow[];
    }
    photosTableAvailable = false;
  }

  const { data, error } = await supabase
    .from('memories')
    .select(SELECT_BASE)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as MemoryRow[];
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

/**
 * Insere a trilha sonora. `album_url` já existe no banco; `preview_url` é adicionado
 * pela migração 002. Se a coluna de prévia ainda não existir, salva sem ela
 * (a prévia é buscada sob demanda na hora de tocar).
 */
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
