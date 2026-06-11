// Tipos das tabelas do Supabase (snake_case espelha o schema do banco).
// Relações aninhadas (author, comments, etc.) existem quando o select as inclui.

export type MemoryType = 'restaurant' | 'movie' | 'place' | 'special' | 'shopping' | 'other';

export interface UserRow {
  id: number;
  username: string;
  display_name: string;
}

export interface AuthorRef {
  display_name: string;
  username?: string;
}

export interface MemoryReactionRow {
  id?: number;
  memory_id?: number;
  emoji: string;
  user_id: number;
}

export interface MemoryCommentRow {
  id: number;
  memory_id?: number;
  author_id?: number;
  content: string;
  author?: AuthorRef | null;
}

export interface FavoriteRow {
  memory_id?: number;
  user_id: number;
}

export interface MemorySpotifyRow {
  id?: number;
  memory_id?: number;
  track_name: string;
  artist: string;
  /** Capa do álbum (coluna existente no banco). */
  album_url?: string | null;
  /** Prévia de áudio de 30s — coluna adicionada pela migração 002 (opcional). */
  preview_url?: string | null;
  spotify_track_id?: string | null;
}

export interface MemoryPhotoRow {
  id?: number;
  memory_id?: number;
  photo_url: string;
  photo_key?: string | null;
  position: number;
}

export interface MemoryRow {
  id: number;
  type: MemoryType;
  title: string;
  description: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  rating: number | null;
  photo_url: string | null;
  created_by?: number;
  created_at: string;
  author?: AuthorRef | null;
  comments?: MemoryCommentRow[];
  reactions?: MemoryReactionRow[];
  favorites?: FavoriteRow[];
  /** PostgREST devolve objeto único (relação 1-para-1) ou null. */
  spotify?: MemorySpotifyRow[] | MemorySpotifyRow | null;
  photos?: MemoryPhotoRow[] | null;
}

export interface MessageRow {
  id: number;
  author_id: number;
  content: string;
  is_important: boolean;
  created_at: string;
  author?: AuthorRef | null;
}

export interface DiaryEntryRow {
  id: number;
  author_id: number;
  content: string;
  mood: string | null;
  created_at: string;
  author?: AuthorRef | null;
}

export interface CalendarEventRow {
  id: number;
  title: string;
  description: string | null;
  event_date: string;
  category: string | null;
}

export interface MovieRow {
  id: number;
  title: string;
  type: string;
  watched: boolean;
  rating: number | null;
  notes: string | null;
  watched_date: string | null;
  created_at?: string;
}

export interface TripItemRow {
  id: number;
  trip_id: number;
  item: string;
  packed: boolean;
}

export interface TripRow {
  id: number;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  budget: number | null;
  spent: number | null;
  items?: TripItemRow[];
}

export interface PollOptionRow {
  id: number;
  poll_id?: number;
  option: string;
}

export interface PollVoteRow {
  id: number;
  poll_id?: number;
  option_id: number;
  user_id: number;
  user?: { username: string } | null;
}

export interface PollRow {
  id: number;
  question: string;
  created_by: number;
  created_at: string;
  options?: PollOptionRow[];
  votes?: PollVoteRow[];
}

export interface CoolThingRow {
  id: number;
  title: string;
  description: string | null;
  category: string | null;
  priority: string | null;
  price: number | null;
  url: string | null;
  purchased: boolean;
  purchased_date: string | null;
  created_by?: number;
  created_at: string;
  creator?: { display_name: string } | null;
}

export interface ActivityRow {
  id: number;
  title: string;
  description: string | null;
  category: string;
  difficulty: string;
  estimated_time: number | null;
}

export interface ActivityHistoryRow {
  id: number;
  activity_id: number;
  done: boolean;
  done_at: string | null;
  sorted_at: string;
  activity?: { title: string; category: string } | null;
}

export type NotificationType = 'reaction' | 'comment' | 'message' | 'poll' | 'special_date' | 'suggestion' | string;

export interface NotificationRow {
  id: number;
  user_id: number;
  type: NotificationType;
  title: string;
  description: string | null;
  related_id: number | null;
  read: boolean;
  created_at: string;
}
