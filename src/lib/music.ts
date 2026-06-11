// Busca de faixas (Deezer/iTunes) compartilhada entre o MusicSearch (formulário)
// e o player do feed (busca a prévia sob demanda quando não está salva no banco).

import { Platform } from 'react-native';

export interface MusicTrack {
  id: number;
  title: string;
  artist: string;
  /** Capa pequena do álbum (pode ser ''). */
  albumArt: string;
  /** MP3 de prévia (~30s). Pode ser '' se a fonte não tiver. */
  previewUrl: string;
  /** Duração da faixa em segundos (0 se desconhecida). */
  duration: number;
}

interface DeezerTrack {
  id: number;
  title: string;
  artist: { name: string };
  album: { title: string; cover_small: string; cover_medium: string };
  preview: string;
  duration: number;
}

interface DeezerSearchResponse {
  data?: DeezerTrack[];
  error?: { type?: string; message?: string; code?: number };
}

interface ITunesTrack {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName?: string;
  artworkUrl60?: string;
  artworkUrl100?: string;
  previewUrl?: string;
  trackTimeMillis?: number;
}

interface ITunesSearchResponse {
  resultCount: number;
  results?: ITunesTrack[];
}

const REQUEST_TIMEOUT_MS = 8000;
const DEFAULT_LIMIT = 8;

/** Busca JSON com timeout próprio, encadeado a um sinal externo de cancelamento. */
async function fetchJsonWithTimeout<T>(url: string, externalSignal: AbortSignal, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const abortFromExternal = () => controller.abort();

  if (externalSignal.aborted) controller.abort();
  externalSignal.addEventListener('abort', abortFromExternal);

  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
    externalSignal.removeEventListener('abort', abortFromExternal);
  }
}

function fromDeezer(item: DeezerTrack): MusicTrack {
  return {
    id: item.id,
    title: item.title,
    artist: item.artist.name,
    albumArt: item.album.cover_medium || item.album.cover_small || '',
    previewUrl: item.preview || '',
    duration: item.duration || 0,
  };
}

function fromITunes(item: ITunesTrack): MusicTrack {
  return {
    id: item.trackId,
    title: item.trackName,
    artist: item.artistName,
    albumArt: item.artworkUrl100 ?? item.artworkUrl60 ?? '',
    previewUrl: item.previewUrl ?? '',
    duration: item.trackTimeMillis ? Math.floor(item.trackTimeMillis / 1000) : 0,
  };
}

async function searchDeezer(url: string, signal: AbortSignal): Promise<MusicTrack[]> {
  const data = await fetchJsonWithTimeout<DeezerSearchResponse>(url, signal);
  if (data.error) throw new Error(data.error.message ?? 'Erro na API do Deezer');
  return (data.data ?? []).map(fromDeezer);
}

/**
 * Estratégia por plataforma:
 * - Nativo (iOS/Android): Deezer direto — fetch nativo não sofre CORS.
 * - Web: iTunes primeiro (CORS liberado); Deezer via corsproxy.io só como último recurso.
 */
export async function searchTracks(term: string, signal: AbortSignal, limit = DEFAULT_LIMIT): Promise<MusicTrack[]> {
  const encoded = encodeURIComponent(term);
  const deezerUrl = `https://api.deezer.com/search?q=${encoded}&limit=${limit}`;

  if (Platform.OS !== 'web') {
    return searchDeezer(deezerUrl, signal);
  }

  try {
    const itunesUrl = `https://itunes.apple.com/search?term=${encoded}&media=music&limit=${limit}`;
    const data = await fetchJsonWithTimeout<ITunesSearchResponse>(itunesUrl, signal);
    return (data.results ?? []).map(fromITunes);
  } catch (itunesError) {
    if (signal.aborted) throw itunesError; // busca substituída — não tenta fallback
    const proxiedUrl = `https://corsproxy.io/?${encodeURIComponent(deezerUrl)}`;
    return searchDeezer(proxiedUrl, signal);
  }
}

/** Acha a melhor prévia para uma faixa já escolhida (track + artist). '' se não houver. */
export async function findPreviewUrl(track: string, artist: string, signal: AbortSignal): Promise<string> {
  const results = await searchTracks(`${track} ${artist}`, signal, 3);
  const withPreview = results.find(r => r.previewUrl);
  return withPreview?.previewUrl ?? '';
}

export function formatTrackDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
