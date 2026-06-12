// Tipos de view-model da feature de feed (memórias).
// MemoryView é o formato pronto para renderização, derivado de MemoryRow ou do mock.

import type { ReactionSummary } from '@/lib/mappers';
import type { MemoryType } from '@/types/domain';
import type { PickedPhoto } from './picked-photo';

/** Id pode ser number (banco) ou string (mock local, ex: 'm1'). */
export type MemoryId = number | string;

export interface MemoryCommentView {
  who: string;
  text: string;
  authorAvatarUrl?: string | null;
}

export interface SpotifyTrackView {
  track: string;
  artist: string;
  previewUrl: string | null;
  albumArt: string | null;
}

export interface MemoryView {
  id: MemoryId;
  cat: string;
  tag: string;
  title: string;
  date: string;
  by: string;
  byAvatarUrl?: string | null;
  loc: string | null;
  desc: string;
  stars: number;
  fav: boolean;
  /** Capa (primeira foto) — usada por galeria/mapa/timeline. */
  photoUrl: string | null;
  /** Todas as fotos da memória, em ordem (carrossel). */
  photos: string[];
  reactions: ReactionSummary[];
  spotify: SpotifyTrackView | null;
  comments: MemoryCommentView[];
  createdAt?: string;
}

/** Valores do formulário de criação/edição de memória. */
export interface MemoryFormValues {
  title: string;
  type: MemoryType;
  description: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  rating: number;
  spotifyTrack: string;
  spotifyArtist: string;
  spotifyPreviewUrl: string;
  spotifyAlbumArt: string;
  /** URLs de fotos já existentes (mantidas na edição) + URLs digitadas. */
  photoUrls: string[];
  /** Fotos novas escolhidas (web: File; nativo: base64) a serem enviadas. */
  pickedPhotos: PickedPhoto[];
  /** Data da memória no formato YYYY-MM-DD. */
  date: string;
}

export const FEED_FILTERS = [
  { key: 'all', label: 'Todas' },
  { key: 'fav', label: '★ Favoritas' },
  { key: 'restaurant', label: 'Restaurantes' },
  { key: 'place', label: 'Lugares' },
  { key: 'travel', label: 'Viagens ✈️' },
  { key: 'movie', label: 'Filmes' },
  { key: 'special', label: 'Especiais' },
  { key: 'date', label: 'Encontros 🌹' },
  { key: 'passeio', label: 'Passeios 🗺️' },
] as const;

export type FeedFilterKey = (typeof FEED_FILTERS)[number]['key'];
