import { isFavoritedBy, summarizeReactions } from '../mappers';
import type { MemoryReactionRow } from '@/types/domain';

describe('summarizeReactions', () => {
  const reactions: MemoryReactionRow[] = [
    { emoji: '❤️', user_id: 1 },
    { emoji: '❤️', user_id: 2 },
    { emoji: '🔥', user_id: 2 },
  ];

  test('aggregates counts per emoji', () => {
    const summary = summarizeReactions(reactions, 1);

    expect(summary).toHaveLength(2);
    expect(summary.find(s => s.emoji === '❤️')?.count).toBe(2);
    expect(summary.find(s => s.emoji === '🔥')?.count).toBe(1);
  });

  test('marks reactions made by the current user', () => {
    const summary = summarizeReactions(reactions, 1);

    expect(summary.find(s => s.emoji === '❤️')?.mine).toBe(true);
    expect(summary.find(s => s.emoji === '🔥')?.mine).toBe(false);
  });

  test('handles null and empty input', () => {
    expect(summarizeReactions(null, 1)).toEqual([]);
    expect(summarizeReactions([], 1)).toEqual([]);
  });
});

describe('isFavoritedBy', () => {
  test('detects favorite by current user', () => {
    expect(isFavoritedBy([{ user_id: 1 }, { user_id: 2 }], 1)).toBe(true);
  });

  test('returns false when user has no favorite', () => {
    expect(isFavoritedBy([{ user_id: 2 }], 1)).toBe(false);
    expect(isFavoritedBy(undefined, 1)).toBe(false);
  });
});
