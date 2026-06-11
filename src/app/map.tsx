// Tela do mapa: mapa interativo (Leaflet) com todos os pontos e uma linha
// do tempo ligando-os em ordem cronológica.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { COLORS } from '@/constants/theme';
import { useToast } from '@/components/ui/toast';
import { useRealtimeRefresh } from '@/hooks/use-realtime';
import { getErrorMessage } from '@/lib/errors';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { InteractiveMap } from '@/features/map/interactive-map';
import type { MapPoint } from '@/features/map/leaflet-html';
import type { MemoryRow } from '@/types/domain';

type MemoryLocationRow = Pick<
  MemoryRow,
  'id' | 'title' | 'location' | 'latitude' | 'longitude' | 'type' | 'photo_url' | 'description' | 'created_at'
>;

interface MappedPoint extends MapPoint {
  id: number;
}

const CATEGORIES = [
  { key: 'all', label: 'Todos' },
  { key: 'special', label: 'Especiais 💖' },
  { key: 'place', label: 'Lugares 🏖️' },
  { key: 'restaurant', label: 'Restaurantes 🍽️' },
] as const;

export default function MapScreen() {
  const { showToast } = useToast();
  const [points, setPoints] = useState<MappedPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const loadPoints = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setPoints([]);
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('memories')
        .select('id, title, location, latitude, longitude, type, photo_url, description, created_at')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rows = (data as MemoryLocationRow[] | null) ?? [];
      const mapped = rows
        .filter(r => typeof r.latitude === 'number' && typeof r.longitude === 'number')
        .map<MappedPoint>(r => ({
          id: r.id,
          title: r.title,
          type: r.type,
          lat: r.latitude as number,
          lng: r.longitude as number,
          date: r.created_at,
          description: r.description ?? '',
          photo: r.photo_url,
        }));
      setPoints(mapped);
    } catch (e) {
      showToast(getErrorMessage(e, 'Não foi possível carregar o mapa.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadPoints();
  }, [loadPoints]);

  useRealtimeRefresh(['memories'], loadPoints);

  const filteredPoints = useMemo(
    () => (activeFilter === 'all' ? points : points.filter(p => p.type === activeFilter)),
    [points, activeFilter],
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backText}>‹ Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nossos Destinos</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
          {CATEGORIES.map(cat => {
            const isActive = activeFilter === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setActiveFilter(cat.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{cat.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Montando o mapa...</Text>
        </View>
      ) : filteredPoints.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.empty}>
            Nenhum ponto com localização nesta categoria.{'\n'}Adicione o local ao registrar uma memória no feed 🗺️
          </Text>
        </View>
      ) : (
        <View style={styles.mapWrap}>
          <InteractiveMap points={filteredPoints} />
          <View style={styles.legend} pointerEvents="none">
            <Text style={styles.legendText}>
              {filteredPoints.length} {filteredPoints.length === 1 ? 'lugar' : 'lugares'} · a linha mostra a ordem do tempo 💕
            </Text>
          </View>
        </View>
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
  headerSpacer: { width: 50 },

  filtersContainer: { backgroundColor: COLORS.surface, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  filtersScroll: { paddingHorizontal: 16, paddingVertical: 10, gap: 10 },
  filterChip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, borderWidth: 0.5, borderColor: COLORS.border, backgroundColor: COLORS.bg },
  filterChipActive: { backgroundColor: COLORS.headerBg, borderColor: COLORS.headerBg },
  filterText: { fontSize: 12.5, color: COLORS.muted },
  filterTextActive: { color: COLORS.headerAccent, fontWeight: '600' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { fontSize: 13, color: COLORS.muted, marginTop: 12 },
  empty: { textAlign: 'center', color: COLORS.muted, fontSize: 13.5, lineHeight: 20, paddingHorizontal: 30 },

  mapWrap: { flex: 1, position: 'relative' },
  legend: {
    position: 'absolute', bottom: 14, alignSelf: 'center',
    backgroundColor: 'rgba(42,26,34,0.85)', borderRadius: 18,
    paddingVertical: 7, paddingHorizontal: 14,
  },
  legendText: { color: '#f0e0e8', fontSize: 11.5, fontWeight: '500' },
});
