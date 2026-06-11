import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { COLORS, RADIUS } from '@/constants/theme';
import { RELATIONSHIP_START_ISO } from '@/constants/config';
import { STATS as MOCK_STATS_BASE } from '@/constants/data';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { getErrorMessage } from '@/lib/errors';
import { useToast } from '@/components/ui/toast';
import type { MemoryType, MovieRow } from '@/types/domain';

interface StatsSummary {
  memories: number;
  restaurants: number;
  places: number;
  movies: number;
  diary: number;
  wishes: number;
  messages: number;
  trips: number;
  specialMemories: number;
  shoppingMemories: number;
  otherMemories: number;
  movieMemories: number;
  favMovie: string;
  favRest: string;
}

const NO_FAV_MOVIE = 'Nenhum ainda 🍿';
const NO_FAV_REST = 'Nenhum ainda 🍽️';
const OTHER_BAR_COLOR = '#777';

const EMPTY_STATS: StatsSummary = {
  memories: 0,
  restaurants: 0,
  places: 0,
  movies: 0,
  diary: 0,
  wishes: 0,
  messages: 0,
  trips: 0,
  specialMemories: 0,
  shoppingMemories: 0,
  otherMemories: 0,
  movieMemories: 0,
  favMovie: NO_FAV_MOVIE,
  favRest: NO_FAV_REST,
};

// Fallback local quando o Supabase não está configurado.
const MOCK_STATS: StatsSummary = {
  ...EMPTY_STATS,
  memories: MOCK_STATS_BASE.memories,
  restaurants: MOCK_STATS_BASE.restaurants,
  movies: MOCK_STATS_BASE.movies,
  trips: MOCK_STATS_BASE.trips,
  places: 5,
  diary: 6,
  wishes: 4,
  messages: 12,
  specialMemories: 4,
  movieMemories: 4,
  shoppingMemories: 2,
  otherMemories: 2,
  favMovie: `${MOCK_STATS_BASE.favMovie} (5 ★)`,
  favRest: `${MOCK_STATS_BASE.favRest} (5 ★)`,
};

async function countTable(table: string): Promise<number> {
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
  if (error) throw error;
  return count ?? 0;
}

async function countMemoriesOfType(type: MemoryType): Promise<number> {
  const { count, error } = await supabase
    .from('memories')
    .select('*', { count: 'exact', head: true })
    .eq('type', type);
  if (error) throw error;
  return count ?? 0;
}

type RatedRow = Pick<MovieRow, 'title' | 'rating'>;

function formatFavorite(rows: RatedRow[] | null, emptyLabel: string): string {
  const top = rows?.[0];
  if (!top || !top.rating) return emptyLabel;
  return `${top.title} (${top.rating} ★)`;
}

export default function StatsScreen() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatsSummary>(EMPTY_STATS);

  const loadStats = useCallback(async () => {
    setLoading(true);

    if (!isSupabaseConfigured) {
      setStats(MOCK_STATS);
      setLoading(false);
      return;
    }

    try {
      const [
        memories,
        restaurants,
        places,
        movies,
        diary,
        wishes,
        messages,
        trips,
        specialMemories,
        shoppingMemories,
        otherMemories,
        movieMemories,
      ] = await Promise.all([
        countTable('memories'),
        countMemoriesOfType('restaurant'),
        countMemoriesOfType('place'),
        countTable('movies'),
        countTable('diary_entries'),
        countTable('cool_things'),
        countTable('messages'),
        countTable('trips'),
        countMemoriesOfType('special'),
        countMemoriesOfType('shopping'),
        countMemoriesOfType('other'),
        countMemoriesOfType('movie'),
      ]);

      const [topMovieResult, topRestaurantResult] = await Promise.all([
        supabase
          .from('movies')
          .select('title, rating')
          .eq('watched', true)
          .order('rating', { ascending: false })
          .limit(1)
          .returns<RatedRow[]>(),
        supabase
          .from('memories')
          .select('title, rating')
          .eq('type', 'restaurant')
          .order('rating', { ascending: false })
          .limit(1)
          .returns<RatedRow[]>(),
      ]);
      if (topMovieResult.error) throw topMovieResult.error;
      if (topRestaurantResult.error) throw topRestaurantResult.error;

      setStats({
        memories,
        restaurants,
        places,
        movies,
        diary,
        wishes,
        messages,
        trips,
        specialMemories,
        shoppingMemories,
        otherMemories,
        movieMemories,
        favMovie: formatFavorite(topMovieResult.data, NO_FAV_MOVIE),
        favRest: formatFavorite(topRestaurantResult.data, NO_FAV_REST),
      });
    } catch (e) {
      showToast(getErrorMessage(e, 'Não foi possível carregar as estatísticas.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const handleBack = useCallback(() => {
    router.back();
  }, []);

  const startDateLabel = useMemo(
    () => new Date(`${RELATIONSHIP_START_ISO}T00:00:00`).toLocaleDateString('pt-BR'),
    [],
  );

  const distribution = useMemo(() => {
    const total = stats.memories || 1;
    const pct = (count: number) => Math.round((count / total) * 100);
    return [
      { label: '🍽️ Restaurantes', count: stats.restaurants, pct: pct(stats.restaurants), color: COLORS.restaurant },
      { label: '🏖️ Lugares', count: stats.places, pct: pct(stats.places), color: COLORS.place },
      { label: '💖 Especiais', count: stats.specialMemories, pct: pct(stats.specialMemories), color: COLORS.accent },
      { label: '🎬 Filmes Assistidos', count: stats.movieMemories, pct: pct(stats.movieMemories), color: COLORS.film },
      { label: '🛍️ Compras & Presentes', count: stats.shoppingMemories, pct: pct(stats.shoppingMemories), color: COLORS.gold },
      { label: '✨ Outros', count: stats.otherMemories, pct: pct(stats.otherMemories), color: OTHER_BAR_COLOR },
    ];
  }, [stats]);

  const totals = useMemo(
    () => [
      { icon: '📸', label: 'Memórias', count: stats.memories, tint: COLORS.accentSoft },
      { icon: '🍽️', label: 'Restaurantes', count: stats.restaurants, tint: COLORS.restaurantTint },
      { icon: '🏖️', label: 'Lugares', count: stats.places, tint: COLORS.placeTint },
      { icon: '🎬', label: 'Filmes & Séries', count: stats.movies, tint: COLORS.filmTint },
      { icon: '📖', label: 'Diários', count: stats.diary, tint: '#e6f4ea' },
      { icon: '🎁', label: 'Wishlist', count: stats.wishes, tint: COLORS.goldSoft },
      { icon: '💌', label: 'Recados', count: stats.messages, tint: '#e3f2fd' },
      { icon: '✈️', label: 'Viagens', count: stats.trips, tint: '#f5f5f5' },
    ],
    [stats],
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Cabeçalho */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
          <Text style={styles.backText}>‹ Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Resumo Geral</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Calculando estatísticas...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Nossos Números 💕</Text>
          <Text style={styles.subtitle}>
            Tudo o que construímos e registramos juntos desde {startDateLabel}
          </Text>

          {/* Destaques */}
          <View style={styles.highlightsContainer}>
            <View style={styles.highlightCard}>
              <Text style={styles.highlightEmoji}>🍽️</Text>
              <View style={styles.flex1}>
                <Text style={styles.highlightLabel}>Restaurante Favorito</Text>
                <Text style={styles.highlightValue}>{stats.favRest}</Text>
              </View>
            </View>

            <View style={styles.highlightCard}>
              <Text style={styles.highlightEmoji}>🎬</Text>
              <View style={styles.flex1}>
                <Text style={styles.highlightLabel}>Filme Favorito</Text>
                <Text style={styles.highlightValue}>{stats.favMovie}</Text>
              </View>
            </View>
          </View>

          {/* Distribuição por categoria */}
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Categorias de Memórias 📊</Text>

            {distribution.map(row => (
              <View key={row.label} style={styles.chartRow}>
                <View style={styles.chartLabelRow}>
                  <Text style={styles.chartLabelText}>{row.label}</Text>
                  <Text style={styles.chartPctText}>{row.pct}% ({row.count})</Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${row.pct}%`, backgroundColor: row.color }]} />
                </View>
              </View>
            ))}
          </View>

          {/* Totais */}
          <Text style={styles.sectionHeading}>Totais Cadastrados</Text>
          <View style={styles.grid}>
            {totals.map(item => (
              <View key={item.label} style={styles.card}>
                <View style={[styles.iconBox, { backgroundColor: item.tint }]}>
                  <Text style={styles.cardIcon}>{item.icon}</Text>
                </View>
                <Text style={styles.cardCount}>{item.count}</Text>
                <Text style={styles.cardLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  flex1: { flex: 1 },
  header: {
    backgroundColor: COLORS.headerBg,
    paddingTop: 54, paddingHorizontal: 16, paddingBottom: 13,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  backBtn: { paddingVertical: 4 },
  backText: { color: COLORS.headerAccent, fontSize: 14, fontWeight: '500' },
  headerTitle: { fontSize: 18, fontStyle: 'italic', fontWeight: '500', color: COLORS.headerText },
  headerSpacer: { width: 50 },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { fontSize: 13, color: COLORS.muted, marginTop: 12 },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16, paddingBottom: 50 },
  title: { fontSize: 22, fontWeight: 'bold', color: COLORS.text, fontStyle: 'italic', textAlign: 'center', marginTop: 10 },
  subtitle: { fontSize: 13, color: COLORS.muted, textAlign: 'center', paddingHorizontal: 16, marginBottom: 16, lineHeight: 18 },

  highlightsContainer: { gap: 12, marginBottom: 8 },
  highlightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    padding: 14,
  },
  highlightEmoji: { fontSize: 28 },
  highlightLabel: { fontSize: 10.5, fontWeight: '700', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.6 },
  highlightValue: { fontSize: 15, fontWeight: 'bold', color: COLORS.text, marginTop: 3, fontStyle: 'italic' },

  chartCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    padding: 16,
    gap: 12,
  },
  chartTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, borderBottomWidth: 0.5, borderBottomColor: COLORS.border, paddingBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  chartRow: { gap: 6 },
  chartLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chartLabelText: { fontSize: 12, fontWeight: '500', color: COLORS.text },
  chartPctText: { fontSize: 11, fontWeight: '600', color: COLORS.muted },
  progressBarBg: { height: 6, backgroundColor: '#efe5e7', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },

  sectionHeading: { fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase', color: '#b59aa1', marginTop: 16, marginBottom: -6 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { width: '48%', backgroundColor: COLORS.surface, borderWidth: 0.5, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: 16, alignItems: 'center', gap: 8 },
  iconBox: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  cardIcon: { fontSize: 22 },
  cardCount: { fontSize: 24, fontWeight: 'bold', color: COLORS.text },
  cardLabel: { fontSize: 12, color: COLORS.muted, fontWeight: '500' },
});
