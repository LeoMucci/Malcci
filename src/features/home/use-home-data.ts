import { useCallback, useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { getErrorMessage } from '@/lib/errors';
import { isFavoritedBy, summarizeReactions, type ReactionSummary } from '@/lib/mappers';
import { useToast } from '@/components/ui/toast';
import { useRealtimeRefresh } from '@/hooks/use-realtime';
import type { MemoryRow, MemoryType, MessageRow } from '@/types/domain';

export interface HomeMemoryPreview {
  id: string;
  cat: MemoryType;
  tag: string;
  title: string;
  date: string;
  by: string;
  loc: string | null;
  desc: string;
  fav: boolean;
  photoUrl: string | null;
  reactions: ReactionSummary[];
  commentCount: number;
  spotify: { track: string; artist: string } | null;
}

export interface HomeMessagePreview {
  name: string;
  text: string;
  time: string;
}

const FALLBACK_AUTHOR = 'Parceiro';

// Fallback local quando o Supabase não está configurado.
const MOCK_MEMORY: HomeMemoryPreview = {
  id: 'mock-m1',
  cat: 'restaurant',
  tag: '5 estrelas',
  title: 'Maní',
  date: '01 Jun',
  by: 'Leonardo',
  loc: 'Jardins, São Paulo',
  desc: 'Menu degustação incrível. O risoto de beterraba foi o prato da noite.',
  fav: true,
  photoUrl: null,
  reactions: [
    { emoji: '❤️', count: 1, mine: true },
    { emoji: '😍', count: 1, mine: false },
  ],
  commentCount: 2,
  spotify: { track: 'La Vie en Rose', artist: 'Édith Piaf' },
};

const MOCK_MESSAGE: HomeMessagePreview = {
  name: 'Leonardo',
  text: 'Já pensei onde vamos jantar no aniversário. Fica na espera pra descobrir onde!',
  time: '10:47',
};

function toMemoryPreview(row: MemoryRow, currentUserId: number): HomeMemoryPreview {
  const createdAt = new Date(row.created_at);
  // PostgREST devolve memory_spotify como objeto único (1-para-1) ou array.
  const spotifyRow = Array.isArray(row.spotify) ? row.spotify[0] : row.spotify ?? undefined;
  return {
    id: String(row.id),
    cat: row.type,
    tag: row.rating && row.rating > 0 ? `${row.rating} estrelas` : 'recente',
    title: row.title,
    date: createdAt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
    by: row.author?.display_name ?? FALLBACK_AUTHOR,
    loc: row.location,
    desc: row.description ?? '',
    fav: isFavoritedBy(row.favorites, currentUserId),
    photoUrl: row.photo_url,
    reactions: summarizeReactions(row.reactions, currentUserId),
    commentCount: row.comments?.length ?? 0,
    spotify: spotifyRow ? { track: spotifyRow.track_name, artist: spotifyRow.artist } : null,
  };
}

function toMessagePreview(row: MessageRow): HomeMessagePreview {
  return {
    name: row.author?.display_name ?? FALLBACK_AUTHOR,
    text: row.content,
    time: new Date(row.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  };
}

interface UseHomeDataResult {
  topMemory: HomeMemoryPreview | null;
  lastMessage: HomeMessagePreview | null;
  loading: boolean;
  reload: () => void;
}

/**
 * Carrega a memória mais recente e o último recado para a home,
 * com fallback local quando o Supabase não está configurado e
 * atualização automática via Realtime.
 */
export function useHomeData(currentUserId: number | undefined): UseHomeDataResult {
  const { showToast } = useToast();
  const [topMemory, setTopMemory] = useState<HomeMemoryPreview | null>(null);
  const [lastMessage, setLastMessage] = useState<HomeMessagePreview | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);

    if (!isSupabaseConfigured) {
      setTopMemory(MOCK_MEMORY);
      setLastMessage(MOCK_MESSAGE);
      setLoading(false);
      return;
    }

    try {
      const [memoriesResult, messagesResult] = await Promise.all([
        supabase
          .from('memories')
          .select(
            `*,
            author:users(display_name),
            comments:memory_comments(id),
            reactions:memory_reactions(emoji, user_id),
            favorites:favorites(user_id),
            spotify:memory_spotify(*)`,
          )
          .order('created_at', { ascending: false })
          .limit(1)
          .returns<MemoryRow[]>(),
        supabase
          .from('messages')
          .select('*, author:users(display_name)')
          .order('created_at', { ascending: false })
          .limit(1)
          .returns<MessageRow[]>(),
      ]);

      if (memoriesResult.error) throw memoriesResult.error;
      if (messagesResult.error) throw messagesResult.error;

      const memory = memoriesResult.data?.[0];
      setTopMemory(memory ? toMemoryPreview(memory, currentUserId ?? -1) : null);

      const message = messagesResult.data?.[0];
      setLastMessage(message ? toMessagePreview(message) : null);
    } catch (e) {
      showToast(getErrorMessage(e, 'Não foi possível carregar os destaques.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [currentUserId, showToast]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useRealtimeRefresh(['memories', 'messages'], reload);

  return { topMemory, lastMessage, loading, reload };
}
