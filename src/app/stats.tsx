import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { COLORS, RADIUS } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';

export default function StatsScreen() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
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
    favMovie: 'Nenhum ainda 🍿',
    favRest: 'Nenhum ainda 🍽️',
  });

  const loadStats = async () => {
    setLoading(true);
    try {
      // 1. Run counts in parallel
      const [
        { count: memories },
        { count: restaurants },
        { count: places },
        { count: movies },
        { count: diary },
        { count: wishes },
        { count: messages },
        { count: trips },
        { count: specialMemories },
        { count: shoppingMemories },
        { count: otherMemories },
        { count: movieMemories },
      ] = await Promise.all([
        supabase.from('memories').select('*', { count: 'exact', head: true }),
        supabase.from('memories').select('*', { count: 'exact', head: true }).eq('type', 'restaurant'),
        supabase.from('memories').select('*', { count: 'exact', head: true }).eq('type', 'place'),
        supabase.from('movies').select('*', { count: 'exact', head: true }),
        supabase.from('diary_entries').select('*', { count: 'exact', head: true }),
        supabase.from('cool_things').select('*', { count: 'exact', head: true }),
        supabase.from('messages').select('*', { count: 'exact', head: true }),
        supabase.from('trips').select('*', { count: 'exact', head: true }),
        supabase.from('memories').select('*', { count: 'exact', head: true }).eq('type', 'special'),
        supabase.from('memories').select('*', { count: 'exact', head: true }).eq('type', 'shopping'),
        supabase.from('memories').select('*', { count: 'exact', head: true }).eq('type', 'other'),
        supabase.from('memories').select('*', { count: 'exact', head: true }).eq('type', 'movie'),
      ]);

      // 2. Fetch top-rated movie
      const { data: topMovie } = await supabase
        .from('movies')
        .select('title, rating')
        .eq('watched', true)
        .order('rating', { ascending: false })
        .limit(1);

      // 3. Fetch top-rated restaurant memory
      const { data: topRestaurant } = await supabase
        .from('memories')
        .select('title, rating')
        .eq('type', 'restaurant')
        .order('rating', { ascending: false })
        .limit(1);

      const favMovieStr = topMovie && topMovie.length > 0 && topMovie[0].rating
        ? `${topMovie[0].title} (${topMovie[0].rating} ★)`
        : 'Nenhum ainda 🍿';

      const favRestStr = topRestaurant && topRestaurant.length > 0 && topRestaurant[0].rating
        ? `${topRestaurant[0].title} (${topRestaurant[0].rating} ★)`
        : 'Nenhum ainda 🍽️';

      setStats({
        memories: memories || 0,
        restaurants: restaurants || 0,
        places: places || 0,
        movies: movies || 0,
        diary: diary || 0,
        wishes: wishes || 0,
        messages: messages || 0,
        trips: trips || 0,
        specialMemories: specialMemories || 0,
        shoppingMemories: shoppingMemories || 0,
        otherMemories: otherMemories || 0,
        movieMemories: movieMemories || 0,
        favMovie: favMovieStr,
        favRest: favRestStr,
      });
    } catch (e) {
      console.error('Failed to fetch statistics:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const totalMemories = stats.memories || 1;
  const pctRest = Math.round((stats.restaurants / totalMemories) * 100);
  const pctPlaces = Math.round((stats.places / totalMemories) * 100);
  const pctSpecial = Math.round((stats.specialMemories / totalMemories) * 100);
  const pctMovies = Math.round((stats.movieMemories / totalMemories) * 100);
  const pctShopping = Math.round((stats.shoppingMemories / totalMemories) * 100);
  const pctOther = Math.round((stats.otherMemories / totalMemories) * 100);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backText}>‹ Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Resumo Geral</Text>
        <View style={{ width: 50 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Calculando estatísticas...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Nossos Números 💕</Text>
          <Text style={styles.subtitle}>Tudo o que construímos e registramos juntos desde 06/12/2024</Text>

          {/* Highlights section */}
          <View style={styles.highlightsContainer}>
            <View style={styles.highlightCard}>
              <Text style={styles.highlightEmoji}>🍽️</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.highlightLabel}>Restaurante Favorito</Text>
                <Text style={styles.highlightValue}>{stats.favRest}</Text>
              </View>
            </View>

            <View style={styles.highlightCard}>
              <Text style={styles.highlightEmoji}>🎬</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.highlightLabel}>Filme Favorito</Text>
                <Text style={styles.highlightValue}>{stats.favMovie}</Text>
              </View>
            </View>
          </View>

          {/* Visual Distribution Chart */}
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Categorias de Memórias 📊</Text>
            
            <View style={styles.chartRow}>
              <View style={styles.chartLabelRow}>
                <Text style={styles.chartLabelText}>🍽️ Restaurantes</Text>
                <Text style={styles.chartPctText}>{pctRest}% ({stats.restaurants})</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${pctRest}%`, backgroundColor: '#b06a4e' }]} />
              </View>
            </View>

            <View style={styles.chartRow}>
              <View style={styles.chartLabelRow}>
                <Text style={styles.chartLabelText}>🏖️ Lugares</Text>
                <Text style={styles.chartPctText}>{pctPlaces}% ({stats.places})</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${pctPlaces}%`, backgroundColor: '#477d50' }]} />
              </View>
            </View>

            <View style={styles.chartRow}>
              <View style={styles.chartLabelRow}>
                <Text style={styles.chartLabelText}>💖 Especiais</Text>
                <Text style={styles.chartPctText}>{pctSpecial}% ({stats.specialMemories})</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${pctSpecial}%`, backgroundColor: COLORS.accent }]} />
              </View>
            </View>

            <View style={styles.chartRow}>
              <View style={styles.chartLabelRow}>
                <Text style={styles.chartLabelText}>🎬 Filmes Assistidos</Text>
                <Text style={styles.chartPctText}>{pctMovies}% ({stats.movieMemories})</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${pctMovies}%`, backgroundColor: '#6a55b0' }]} />
              </View>
            </View>

            <View style={styles.chartRow}>
              <View style={styles.chartLabelRow}>
                <Text style={styles.chartLabelText}>🛍️ Compras & Presentes</Text>
                <Text style={styles.chartPctText}>{pctShopping}% ({stats.shoppingMemories})</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${pctShopping}%`, backgroundColor: COLORS.gold }]} />
              </View>
            </View>

            <View style={styles.chartRow}>
              <View style={styles.chartLabelRow}>
                <Text style={styles.chartLabelText}>✨ Outros</Text>
                <Text style={styles.chartPctText}>{pctOther}% ({stats.otherMemories})</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${pctOther}%`, backgroundColor: '#777' }]} />
              </View>
            </View>
          </View>

          {/* Counts Grid */}
          <Text style={styles.sectionHeading}>Totais Cadastrados</Text>
          <View style={styles.grid}>
            {[
              { icon: '📸', label: 'Memórias', count: stats.memories, tint: COLORS.accentSoft },
              { icon: '🍽️', label: 'Restaurantes', count: stats.restaurants, tint: '#faece4' },
              { icon: '🏖️', label: 'Lugares', count: stats.places, tint: '#e7f1e8' },
              { icon: '🎬', label: 'Filmes & Séries', count: stats.movies, tint: '#eee9fb' },
              { icon: '📖', label: 'Diários', count: stats.diary, tint: '#e6f4ea' },
              { icon: '🎁', label: 'Wishlist', count: stats.wishes, tint: COLORS.goldSoft },
              { icon: '💌', label: 'Recados', count: stats.messages, tint: '#e3f2fd' },
              { icon: '✈️', label: 'Viagens', count: stats.trips, tint: '#f5f5f5' },
            ].map((s, idx) => (
              <View key={idx} style={styles.card}>
                <View style={[styles.iconBox, { backgroundColor: s.tint }]}>
                  <Text style={{ fontSize: 22 }}>{s.icon}</Text>
                </View>
                <Text style={styles.cardCount}>{s.count}</Text>
                <Text style={styles.cardLabel}>{s.label}</Text>
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
  header: {
    backgroundColor: COLORS.headerBg,
    paddingTop: 54, paddingHorizontal: 16, paddingBottom: 13,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  backBtn: { paddingVertical: 4 },
  backText: { color: COLORS.headerAccent, fontSize: 14, fontWeight: '500' },
  headerTitle: { fontSize: 18, fontStyle: 'italic', fontWeight: '500', color: COLORS.headerText },

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
  cardCount: { fontSize: 24, fontWeight: 'bold', color: COLORS.text },
  cardLabel: { fontSize: 12, color: COLORS.muted, fontWeight: '500' },
});
