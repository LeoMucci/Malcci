import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams } from 'expo-router';
import { COLORS } from '@/constants/theme';
import { sharedStyles } from '@/constants/shared-styles';
import { isSupabaseConfigured } from '@/lib/supabase';
import { CalendarSection } from '@/features/plan/calendar-section';
import { TripsSection } from '@/features/plan/trips-section';
import { MoviesSection } from '@/features/plan/movies-section';
import { usePlanData } from '@/features/plan/use-plan-data';
import type { PlanTab } from '@/features/plan/types';

const TABS: { key: PlanTab; label: string }[] = [
  { key: 'calendar', label: 'Calendário' },
  { key: 'trips', label: 'Viagens' },
  { key: 'movies', label: 'Filmes' },
];

/** Aceita deep-link ?tab=calendar|trips|movies (vindo da tela "Mais"). */
function parseTabParam(value: string | undefined): PlanTab | null {
  if (value === 'calendar' || value === 'trips' || value === 'movies') return value;
  return null;
}

export default function PlanScreen() {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<PlanTab>(() => parseTabParam(tab) ?? 'calendar');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const {
    loading,
    events,
    trips,
    movies,
    addEvent,
    deleteEvent,
    addTrip,
    toggleTripItem,
    addTripItem,
    addMovie,
    markMovieWatched,
    deleteMovie,
  } = usePlanData();

  useEffect(() => {
    const parsed = parseTabParam(tab);
    if (parsed) setActiveTab(parsed);
  }, [tab]);

  const openAddModal = useCallback(() => setIsAddModalOpen(true), []);
  const closeAddModal = useCallback(() => setIsAddModalOpen(false), []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Nossos planos</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAddModal} activeOpacity={0.7}>
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Aviso de modo local quando o Supabase não está configurado */}
      {!isSupabaseConfigured && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            💡 Modo Local. Configure as credenciais no arquivo `.env` para sincronizar no banco de dados.
          </Text>
        </View>
      )}

      {/* Abas */}
      <View style={styles.filterRowContainer}>
        <View style={styles.filterRow}>
          {TABS.map(t => (
            <TouchableOpacity
              key={t.key}
              style={[styles.filterChip, activeTab === t.key && styles.filterChipOn]}
              onPress={() => setActiveTab(t.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterText, activeTab === t.key && styles.filterTextOn]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={sharedStyles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Carregando planos...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'calendar' && (
            <CalendarSection
              events={events}
              addModalVisible={isAddModalOpen}
              onOpenAddModal={openAddModal}
              onCloseAddModal={closeAddModal}
              onAddEvent={addEvent}
              onDeleteEvent={deleteEvent}
            />
          )}

          {activeTab === 'trips' && (
            <TripsSection
              trips={trips}
              addModalVisible={isAddModalOpen}
              onCloseAddModal={closeAddModal}
              onAddTrip={addTrip}
              onToggleItem={toggleTripItem}
              onAddItem={addTripItem}
            />
          )}

          {activeTab === 'movies' && (
            <MoviesSection
              movies={movies}
              addModalVisible={isAddModalOpen}
              onCloseAddModal={closeAddModal}
              onAddMovie={addMovie}
              onMarkWatched={markMovieWatched}
              onDeleteMovie={deleteMovie}
            />
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    backgroundColor: COLORS.headerBg,
    paddingTop: 54,
    paddingHorizontal: 16,
    paddingBottom: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 22, fontStyle: 'italic', fontWeight: '500', color: COLORS.headerText },
  addBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#fff', fontSize: 18 },

  warningBanner: {
    backgroundColor: COLORS.goldSoft,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(199, 154, 58, 0.2)',
  },
  warningText: {
    fontSize: 10.5,
    color: COLORS.gold,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 15,
  },

  filterRowContainer: { backgroundColor: COLORS.bg, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 13, gap: 10 },
  filterChip: { paddingVertical: 7, paddingHorizontal: 16, borderRadius: 20, borderWidth: 0.5, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  filterChipOn: { backgroundColor: COLORS.headerBg, borderColor: COLORS.headerBg },
  filterText: { fontSize: 12.5, color: COLORS.muted },
  filterTextOn: { color: COLORS.headerAccent },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16, paddingBottom: 30 },

  loadingText: { fontSize: 13, color: COLORS.muted, marginTop: 12 },
});
