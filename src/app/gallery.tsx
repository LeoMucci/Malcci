import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Dimensions, Modal } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { COLORS, RADIUS } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';

interface PhotoMemory {
  id: number;
  title: string;
  photo_url: string;
  type: string;
  created_at: string;
}

const FILTERS = [
  { key: 'all', label: 'Todas' },
  { key: 'restaurant', label: 'Restaurantes 🍽️' },
  { key: 'place', label: 'Lugares 🏖️' },
  { key: 'special', label: 'Especiais ⭐' },
  { key: 'other', label: 'Outros ✨' },
];

const screenWidth = Dimensions.get('window').width;
const imageSize = (screenWidth - 40) / 3; // 3 items per row, padding 16, gap 4

export default function GalleryScreen() {
  const [photos, setPhotos] = useState<PhotoMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [previewPhoto, setPreviewPhoto] = useState<PhotoMemory | null>(null);

  const loadPhotos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('memories')
        .select('id, title, photo_url, type, created_at')
        .not('photo_url', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter out empty urls if any
      const validPhotos = (data || []).filter(p => p.photo_url && p.photo_url.trim() !== '');
      setPhotos(validPhotos);
    } catch (e) {
      console.error('Failed to load gallery:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPhotos();
  }, []);

  const filteredPhotos = activeFilter === 'all' 
    ? photos 
    : photos.filter(p => p.type === activeFilter);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backText}>‹ Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mural de Fotos</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Filter Row */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
          {FILTERS.map(f => {
            const isActive = activeFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setActiveFilter(f.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Carregando lembranças...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.grid}>
            {filteredPhotos.map(photo => (
              <TouchableOpacity
                key={photo.id}
                style={styles.imageWrapper}
                onPress={() => setPreviewPhoto(photo)}
                activeOpacity={0.85}
              >
                <Image source={{ uri: photo.photo_url }} style={styles.gridImage} />
              </TouchableOpacity>
            ))}
          </View>

          {filteredPhotos.length === 0 && (
            <Text style={styles.empty}>Nenhuma foto cadastrada nesta categoria. Registre momentos especiais no feed! 📸</Text>
          )}
        </ScrollView>
      )}

      {/* Fullscreen Photo Modal Preview */}
      {previewPhoto && (
        <Modal transparent visible={!!previewPhoto} animationType="fade" onRequestClose={() => setPreviewPhoto(null)}>
          <View style={styles.previewOverlay}>
            <TouchableOpacity style={styles.closeOverlay} onPress={() => setPreviewPhoto(null)} activeOpacity={1}>
              <View style={styles.previewCard}>
                <Image source={{ uri: previewPhoto.photo_url }} style={styles.previewImage} resizeMode="contain" />
                <View style={styles.previewInfo}>
                  <Text style={styles.previewTitle}>{previewPhoto.title}</Text>
                  <Text style={styles.previewDate}>
                    Lembrança de {new Date(previewPhoto.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </Text>
                </View>
                <TouchableOpacity style={styles.closeBtn} onPress={() => setPreviewPhoto(null)}>
                  <Text style={styles.closeBtnText}>Fechar</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>
        </Modal>
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
  scrollContent: { padding: 8, paddingBottom: 30 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  imageWrapper: { width: imageSize, height: imageSize, borderRadius: RADIUS.sm, overflow: 'hidden', backgroundColor: '#efeae7' },
  gridImage: { width: '100%', height: '100%', resizeMode: 'cover' },

  /* Fullscreen Preview modal */
  previewOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.85)', justifyContent: 'center', alignItems: 'center' },
  closeOverlay: { flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center', padding: 20 },
  previewCard: { width: '100%', maxWidth: 400, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, overflow: 'hidden', paddingBottom: 16 },
  previewImage: { width: '100%', aspectRatio: 1.1, backgroundColor: '#000' },
  previewInfo: { padding: 16, gap: 4 },
  previewTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.text },
  previewDate: { fontSize: 12, color: COLORS.muted },
  closeBtn: { marginTop: 8, alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 24, borderRadius: 20, backgroundColor: COLORS.accent },
  closeBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
