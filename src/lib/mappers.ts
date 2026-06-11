import type { FavoriteRow, MemoryReactionRow } from '@/types/domain';

export interface ReactionSummary {
  emoji: string;
  count: number;
  mine: boolean;
}

/** Agrega reações cruas em contagens por emoji, marcando as do usuário atual. */
export function summarizeReactions(
  reactions: MemoryReactionRow[] | null | undefined,
  currentUserId: number,
): ReactionSummary[] {
  const byEmoji = new Map<string, ReactionSummary>();
  for (const reaction of reactions ?? []) {
    const existing = byEmoji.get(reaction.emoji);
    if (existing) {
      byEmoji.set(reaction.emoji, {
        ...existing,
        count: existing.count + 1,
        mine: existing.mine || reaction.user_id === currentUserId,
      });
    } else {
      byEmoji.set(reaction.emoji, {
        emoji: reaction.emoji,
        count: 1,
        mine: reaction.user_id === currentUserId,
      });
    }
  }
  return [...byEmoji.values()];
}

/** Verifica se o usuário atual favoritou (lista vinda do join de favorites). */
export function isFavoritedBy(
  favorites: FavoriteRow[] | null | undefined,
  currentUserId: number,
): boolean {
  return (favorites ?? []).some(fav => fav.user_id === currentUserId);
}
