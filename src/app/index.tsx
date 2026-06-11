import React, { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router, type Href } from 'expo-router';
import { COLORS, RADIUS } from '@/constants/theme';
import { COUPLE } from '@/constants/config';
import { useAuth } from '@/hooks/use-auth';
import { getRelationshipStats } from '@/lib/relationship';
import { HomeHero } from '@/features/home/home-hero';
import { LatestMemoryCard } from '@/features/home/latest-memory-card';
import { LatestMessageCard } from '@/features/home/latest-message-card';
import { useHomeData } from '@/features/home/use-home-data';
import { useStartDate } from '@/features/home/use-start-date';

interface QuickLink {
  icon: string;
  label: string;
  route: Href;
}

const QUICK_LINKS: QuickLink[] = [
  { icon: '📸', label: 'Memórias', route: '/feed' },
  { icon: '📅', label: 'Planos', route: '/plan' },
  { icon: '💬', label: 'Recados', route: '/notes' },
  { icon: '✨', label: 'Mais', route: '/more' },
];

export default function HomeScreen() {
  const { user } = useAuth();
  const { startIso, saveStartDate } = useStartDate();
  const stats = useMemo(() => getRelationshipStats(startIso), [startIso]);
  const { topMemory, lastMessage, loading } = useHomeData(user?.id);

  const userName = user?.displayName ?? COUPLE.nameA;
  const isUserA = user?.username === 'ela';

  const handleOpenActivities = useCallback(() => {
    router.push('/activities');
  }, []);

  const handleOpenTimeline = useCallback(() => {
    router.push('/timeline');
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <HomeHero
        stats={stats}
        startIso={startIso}
        onSaveStartDate={saveStartDate}
        userName={userName}
        isUserA={isUserA}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Acesso rápido */}
        <Text style={styles.secLabel}>acesso rápido</Text>
        <View style={styles.quickGrid}>
          {QUICK_LINKS.map(link => (
            <TouchableOpacity
              key={link.label}
              style={styles.quickBtn}
              activeOpacity={0.7}
              onPress={() => router.push(link.route)}
            >
              <Text style={styles.quickIcon}>{link.icon}</Text>
              <Text style={styles.quickLabel}>{link.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Banner do dado de atividades */}
        <TouchableOpacity style={styles.diceBanner} activeOpacity={0.8} onPress={handleOpenActivities}>
          <Text style={styles.diceEmoji}>🎲</Text>
          <View style={styles.flex1}>
            <Text style={styles.diceTitle}>O que fazemos agora?</Text>
            <Text style={styles.diceSub}>Sorteie uma atividade pra dois</Text>
          </View>
          <Text style={styles.diceChevron}>›</Text>
        </TouchableOpacity>

        {/* Aviso do próximo aniversário */}
        <Text style={styles.secLabel}>para vocês</Text>
        <TouchableOpacity style={styles.notifCard} activeOpacity={0.7} onPress={handleOpenTimeline}>
          <View style={[styles.notifIcon, { backgroundColor: COLORS.accentSoft }]}>
            <Text style={styles.notifEmoji}>💕</Text>
          </View>
          <View style={styles.flex1}>
            <Text style={styles.notifTitle}>Faltam {stats.nextIn} dias</Text>
            <Text style={styles.notifText}>Para o próximo aniversário de namoro de vocês! 👩‍❤️‍👨</Text>
          </View>
        </TouchableOpacity>

        {/* Último recado */}
        <Text style={styles.secLabel}>último recado</Text>
        <LatestMessageCard message={lastMessage} loading={loading} />

        {/* Memória mais recente */}
        <Text style={styles.secLabel}>memória mais recente</Text>
        <LatestMemoryCard memory={topMemory} loading={loading} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  flex1: { flex: 1 },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 18, paddingBottom: 30 },

  secLabel: {
    fontSize: 10.5,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: '#b59aa1',
    marginBottom: -6,
  },

  quickGrid: { flexDirection: 'row', gap: 9 },
  quickBtn: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingVertical: 13,
    paddingHorizontal: 5,
    alignItems: 'center',
    gap: 7,
  },
  quickIcon: { fontSize: 23 },
  quickLabel: { fontSize: 10, color: COLORS.muted, textAlign: 'center', letterSpacing: 0.2 },

  diceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    padding: 14,
  },
  diceEmoji: { fontSize: 26 },
  diceTitle: {
    fontStyle: 'italic',
    fontSize: 18,
    color: '#fff',
  },
  diceSub: { fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 3 },
  diceChevron: { color: '#fff', opacity: 0.6, fontSize: 18 },

  notifCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 12,
  },
  notifIcon: {
    width: 38, height: 38, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  notifEmoji: { fontSize: 18 },
  notifTitle: { fontSize: 13, color: COLORS.text, fontWeight: '500' },
  notifText: { fontSize: 11.5, color: COLORS.muted, marginTop: 2 },
});
