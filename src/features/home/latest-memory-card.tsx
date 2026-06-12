import React, { useCallback } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { COLORS, MTYPE, RADIUS } from '@/constants/theme';
import type { HomeMemoryPreview } from '@/features/home/use-home-data';

const MAX_VISIBLE_REACTIONS = 3;

const CATEGORY_EMOJI: Record<string, string> = {
  restaurant: '🍽️',
  movie: '🎬',
  place: '📍',
  special: '💖',
  shopping: '🛍️',
  date: '🌹',
  passeio: '🗺️',
  travel: '✈️',
};
const DEFAULT_CATEGORY_EMOJI = '✨';

interface LatestMemoryCardProps {
  memory: HomeMemoryPreview | null;
  loading: boolean;
}

/** Prévia da memória mais recente na home (navega para o feed ao tocar). */
export function LatestMemoryCard({ memory, loading }: LatestMemoryCardProps) {
  const handlePress = useCallback(() => {
    router.push('/feed');
  }, []);

  if (loading) {
    return <ActivityIndicator size="small" color={COLORS.accent} style={styles.loading} />;
  }

  if (!memory) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyCardText}>
          Nenhuma memória cadastrada. Registre a sua primeira memória no feed! 📸
        </Text>
      </View>
    );
  }

  const typeMeta = MTYPE[memory.cat] ?? MTYPE.other;
  const categoryEmoji = CATEGORY_EMOJI[memory.cat] ?? DEFAULT_CATEGORY_EMOJI;

  return (
    <TouchableOpacity style={styles.feedCard} activeOpacity={0.8} onPress={handlePress}>
      {memory.photoUrl ? (
        <Image source={{ uri: memory.photoUrl }} style={styles.topMemoryPhoto} />
      ) : (
        <View style={[styles.feedPhoto, { backgroundColor: typeMeta.tint }]}>
          <Text style={styles.placeholderEmoji}>{categoryEmoji}</Text>
          <View style={styles.feedIconBadge}>
            <Text style={styles.badgeEmoji}>{categoryEmoji}</Text>
          </View>
        </View>
      )}

      <View style={styles.feedBody}>
        <View style={styles.feedMeta}>
          <Text style={styles.feedType}>{typeMeta.label}</Text>
          <Text style={styles.feedDate}>{memory.date}</Text>
          <View style={[styles.feedTag, { backgroundColor: typeMeta.tint }]}>
            <Text style={[styles.feedTagText, { color: typeMeta.color }]}>{memory.tag}</Text>
          </View>
        </View>
        <Text style={styles.feedTitle}>{memory.title}</Text>
        {memory.loc && (
          <Text style={styles.feedLoc}>📍 {memory.loc} · {memory.by}</Text>
        )}
        <Text style={styles.feedDesc} numberOfLines={3}>{memory.desc}</Text>

        {memory.spotify && (
          <View style={styles.spotifyMini}>
            <Text style={styles.spotifyNote}>♫</Text>
            <Text style={styles.spotifyText}>
              <Text style={styles.spotifyTrack}>{memory.spotify.track}</Text>
              {' · '}{memory.spotify.artist}
            </Text>
          </View>
        )}
        <View style={styles.feedFoot}>
          <View style={styles.reactRow}>
            {memory.reactions.slice(0, MAX_VISIBLE_REACTIONS).map(reaction => (
              <View
                key={reaction.emoji}
                style={[styles.reactPill, reaction.mine && styles.reactPillMine]}
              >
                <Text style={styles.reactEmoji}>{reaction.emoji}</Text>
                <Text style={[styles.reactCount, reaction.mine && styles.reactCountMine]}>
                  {reaction.count}
                </Text>
              </View>
            ))}
          </View>
          <View style={styles.commentBtn}>
            <Text style={styles.commentIcon}>💬</Text>
            <Text style={styles.commentCount}>{memory.commentCount}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  loading: { paddingVertical: 20 },

  emptyCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCardText: {
    fontSize: 12,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 18,
  },

  feedCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
  },
  topMemoryPhoto: {
    height: 180,
    width: '100%',
    resizeMode: 'cover',
  },
  feedPhoto: {
    height: 158,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  placeholderEmoji: { fontSize: 42, opacity: 0.5 },
  feedIconBadge: {
    position: 'absolute',
    top: 11, left: 11,
    width: 30, height: 30,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.86)',
    alignItems: 'center', justifyContent: 'center',
  },
  badgeEmoji: { fontSize: 14 },
  feedBody: { padding: 13, paddingBottom: 15 },
  feedMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  feedType: { fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: COLORS.muted },
  feedDate: { fontSize: 10.5, color: '#c3aab2', marginLeft: 'auto' },
  feedTag: { paddingVertical: 3, paddingHorizontal: 9, borderRadius: 11 },
  feedTagText: { fontSize: 9.5, letterSpacing: 0.6, textTransform: 'uppercase', fontWeight: '500' },
  feedTitle: { fontSize: 20, color: COLORS.text, fontWeight: '500', marginBottom: 4 },
  feedLoc: { fontSize: 11, color: COLORS.muted, marginBottom: 6 },
  feedDesc: { fontSize: 12.5, color: '#8a7178', lineHeight: 19, marginBottom: 12 },
  feedFoot: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reactRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  reactPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingVertical: 4, paddingHorizontal: 9,
  },
  reactPillMine: {
    backgroundColor: COLORS.accentSoft,
    borderColor: 'rgba(200,90,124,0.4)',
  },
  reactEmoji: { fontSize: 13 },
  reactCount: { fontSize: 11, color: COLORS.muted, fontWeight: '600' },
  reactCountMine: { color: COLORS.accentDeep },
  commentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginLeft: 'auto',
  },
  commentIcon: { fontSize: 15, color: COLORS.muted },
  commentCount: { fontSize: 12, color: COLORS.muted },
  spotifyMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f2f7f2',
    borderRadius: 10,
    paddingVertical: 7, paddingHorizontal: 10,
    marginBottom: 11,
  },
  spotifyNote: { fontSize: 17, color: '#1DB954' },
  spotifyText: { fontSize: 11, color: '#5a6b5c' },
  spotifyTrack: { fontWeight: '600', color: '#3a4a3c' },
});
