import React, { useCallback } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { COLORS, RADIUS } from '@/constants/theme';
import type { HomeMessagePreview } from '@/features/home/use-home-data';

interface LatestMessageCardProps {
  message: HomeMessagePreview | null;
  loading: boolean;
}

/** Prévia do último recado na home (navega para os recados ao tocar). */
export function LatestMessageCard({ message, loading }: LatestMessageCardProps) {
  const handlePress = useCallback(() => {
    router.push('/notes');
  }, []);

  if (loading) {
    return <ActivityIndicator size="small" color={COLORS.accent} style={styles.loading} />;
  }

  if (!message) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyCardText}>
          Nenhum recado cadastrado. Deixe uma nota para o seu amor! ✍️
        </Text>
      </View>
    );
  }

  return (
    <TouchableOpacity style={styles.msgCard} activeOpacity={0.7} onPress={handlePress}>
      <View style={styles.msgDot} />
      <View style={styles.flex1}>
        <Text style={styles.msgSender}>{message.name}</Text>
        <Text style={styles.msgText}>{message.text}</Text>
      </View>
      <Text style={styles.msgTime}>{message.time}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  loading: { paddingVertical: 12 },

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

  msgCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    padding: 13,
  },
  msgDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.accent, marginTop: 5 },
  msgSender: { fontSize: 11, color: COLORS.muted, marginBottom: 2 },
  msgText: { fontSize: 13.5, color: COLORS.text, lineHeight: 19 },
  msgTime: { fontSize: 10.5, color: '#c3aab2', marginLeft: 'auto' },
});
