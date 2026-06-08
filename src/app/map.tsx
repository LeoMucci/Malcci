import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Alert, Linking, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { COLORS, RADIUS, MTYPE } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';

interface MemoryLocation {
  id: number;
  title: string;
  location: string;
  latitude?: number;
  longitude?: number;
  type: string;
  rating?: number;
  photo_url?: string;
  description?: string;
  created_at: string;
}

const CATEGORIES = [
  { key: 'all', label: 'Todos', color: COLORS.accent },
  { key: 'restaurant', label: 'Restaurantes 🍽️', color: COLORS.restaurant },
  { key: 'place', label: 'Lugares 🏖️', color: COLORS.place },
  { key: 'special', label: 'Especiais ⭐', color: COLORS.special },
];

export default function MapScreen() {
  const [locations, setLocations] = useState<MemoryLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');

  const loadLocations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('memories')
        .select('id, title, location, latitude, longitude, type, rating, photo_url, description, created_at')
        .not('location', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLocations((data || []).filter(item => item.location.trim() !== ''));
    } catch (e) {
      console.error('Failed to load locations:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLocations();
  }, []);

  const handleOpenMap = (item: MemoryLocation) => {
    let url = '';
    const label = encodeURIComponent(item.title);

    if (item.latitude && item.longitude) {
      // GPS Coordinates available
      if (Platform.OS === 'ios') {
        url = `maps://maps.apple.com/?q=${label}&ll=${item.latitude},${item.longitude}`;
      } else {
        url = `geo:${item.latitude},${item.longitude}?q=${item.latitude},${item.longitude}(${label})`;
      }
    } else {
      // Fallback search by address text
      const address = encodeURIComponent(item.location);
      if (Platform.OS === 'ios') {
        url = `maps://maps.apple.com/?q=${address}`;
      } else {
        url = `geo:0,0?q=${address}`;
      }
    }

    // Web fallback if geo URI scheme fails
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        const webUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location)}`;
        Linking.openURL(webUrl);
      }
    }).catch(err => {
      console.error('Error opening map URL:', err);
    });
  };

  const filteredList = activeFilter === 'all' 
    ? locations 
    : locations.filter(loc => loc.type === activeFilter);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backText}>‹ Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nossos Destinos</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Categories chips */}
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
          <Text style={styles.loadingText}>Buscando lugares visitados...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {filteredList.map(item => {
            const meta = MTYPE[item.type] || MTYPE.other;
            const hasCoords = !!(item.latitude && item.longitude);
            return (
              <View key={item.id} style={styles.card}>
                {item.photo_url ? (
                  <Image source={{ uri: item.photo_url }} style={styles.cardImage} />
                ) : (
                  <View style={[styles.cardPlaceholder, { backgroundColor: meta.tint }]}>
                    <Text style={{ fontSize: 36 }}>📍</Text>
                  </View>
                )}

                <View style={styles.cardBody}>
                  <View style={styles.cardMeta}>
                    <Text style={[styles.cardType, { color: meta.color }]}>{meta.label.toUpperCase()}</Text>
                    <Text style={styles.cardDate}>
                      {new Date(item.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    </Text>
                  </View>

                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardLoc}>📍 {item.location}</Text>

                  {item.description ? (
                    <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
                  ) : null}

                  {item.rating ? (
                    <View style={styles.starsRow}>
                      {Array.from({ length: item.rating }).map((_, i) => (
                        <Text key={i} style={{ fontSize: 13, color: '#ffd479' }}>★</Text>
                      ))}
                    </View>
                  ) : null}

                  <TouchableOpacity style={styles.mapBtn} onPress={() => handleOpenMap(item)}>
                    <Text style={styles.mapBtnText}>
                      {hasCoords ? 'Traçar Rota no GPS 🗺️' : 'Ver Endereço no Mapa 🗺️'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          {filteredList.length === 0 && (
            <Text style={styles.empty}>Nenhum lugar cadastrado com localização nesta categoria. Adicione no feed! 🗺️</Text>
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
    paddingTop: 54, paddingHorizontal: 16, paddingBottom: 13,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  backBtn: { paddingVertical: 4 },
  backText: { color: COLORS.headerAccent, fontSize: 14, fontWeight: '500' },
  headerTitle: { fontSize: 18, fontStyle: 'italic', fontWeight: '500', color: COLORS.headerText },

  filtersContainer: { backgroundColor: COLORS.surface, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  filtersScroll: { paddingHorizontal: 16, paddingVertical: 10, gap: 10 },
  filterChip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, borderWidth: 0.5, borderColor: COLORS.border, backgroundColor: COLORS.bg },
  filterChipActive: { backgroundColor: COLORS.headerBg, borderColor: COLORS.headerBg },
  filterText: { fontSize: 12.5, color: COLORS.muted },
  filterTextActive: { color: COLORS.headerAccent, fontWeight: '600' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { fontSize: 13, color: COLORS.muted, marginTop: 12 },
  empty: { textAlign: 'center', color: COLORS.muted, paddingVertical: 80, fontSize: 13, paddingHorizontal: 40 },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16, paddingBottom: 30 },

  card: { backgroundColor: COLORS.surface, borderWidth: 0.5, borderColor: COLORS.border, borderRadius: RADIUS.sm, overflow: 'hidden' },
  cardImage: { width: '100%', height: 160, resizeMode: 'cover' },
  cardPlaceholder: { width: '100%', height: 100, alignItems: 'center', justifyContent: 'center' },
  cardBody: { padding: 16, gap: 8 },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardType: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1 },
  cardDate: { fontSize: 11, color: COLORS.muted },
  cardTitle: { fontSize: 17, fontWeight: 'bold', color: COLORS.text },
  cardLoc: { fontSize: 12, color: COLORS.muted },
  cardDesc: { fontSize: 13, color: '#665', lineHeight: 18 },
  starsRow: { flexDirection: 'row', gap: 2 },
  mapBtn: { marginTop: 6, width: '100%', backgroundColor: COLORS.accent, paddingVertical: 11, borderRadius: RADIUS.sm, alignItems: 'center' },
  mapBtnText: { color: '#fff', fontSize: 12.5, fontWeight: 'bold' },
});
