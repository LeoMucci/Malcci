import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { COLORS, RADIUS } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';

interface DiaryEntry {
  id: number;
  content: string;
  mood: 'happy' | 'sad' | 'excited' | 'calm' | 'romantic' | 'tired' | 'grateful';
  created_at: string;
  author_id: number;
  author?: {
    display_name: string;
    username: string;
  };
}

const MOODS_MAP = {
  happy: { emoji: '😊', label: 'Feliz', color: '#ffb3ba' },
  romantic: { emoji: '🥰', label: 'Romântico', color: '#ffc6ff' },
  calm: { emoji: '😌', label: 'Calmo', color: '#caffbf' },
  excited: { emoji: '🤩', label: 'Animado', color: '#ffd6a5' },
  tired: { emoji: '😴', label: 'Cansado', color: '#bdb2ff' },
  grateful: { emoji: '🙏', label: 'Grato', color: '#fdffb6' },
  sad: { emoji: '😢', label: 'Triste', color: '#a0c4ff' },
};

export default function DiaryScreen() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [selectedMood, setSelectedMood] = useState<keyof typeof MOODS_MAP>('happy');
  const [submitting, setSubmitting] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedFilterMood, setSelectedFilterMood] = useState<string>('all');

  const loadEntries = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('diary_entries')
        .select(`
          *,
          author:users(display_name, username)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (e) {
      console.error('Failed to load diary entries:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, []);

  const handleAddEntry = async () => {
    if (!newContent.trim() || !user) return;
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('diary_entries')
        .insert({
          content: newContent,
          mood: selectedMood,
          author_id: user.id,
        });

      if (error) throw error;

      setNewContent('');
      setSelectedMood('happy');
      setIsAdding(false);
      loadEntries();
    } catch (e) {
      console.error('Failed to save diary entry:', e);
      Alert.alert('Erro', 'Não foi possível salvar a entrada do diário.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEntry = async (id: number) => {
    Alert.alert(
      'Deletar Entrada',
      'Tem certeza que deseja apagar este dia do diário?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Deletar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('diary_entries')
                .delete()
                .eq('id', id);

              if (error) throw error;
              loadEntries();
            } catch (e) {
              console.error('Failed to delete entry:', e);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backText}>‹ Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Diário de Casal</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setIsAdding(true)} activeOpacity={0.7}>
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Mood Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
          <TouchableOpacity
            style={[styles.filterChip, selectedFilterMood === 'all' && styles.filterChipActive]}
            onPress={() => setSelectedFilterMood('all')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterText, selectedFilterMood === 'all' && styles.filterTextActive]}>Todos</Text>
          </TouchableOpacity>
          {Object.keys(MOODS_MAP).map(key => {
            const mood = MOODS_MAP[key as keyof typeof MOODS_MAP];
            const isActive = selectedFilterMood === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setSelectedFilterMood(key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                  {mood.emoji} {mood.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Buscar no diário..."
          placeholderTextColor="#a69098"
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Carregando páginas do diário...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {entries
            .filter(e => {
              const matchMood = selectedFilterMood === 'all' ? true : e.mood === selectedFilterMood;
              const matchText = !searchText.trim() || e.content.toLowerCase().includes(searchText.toLowerCase());
              return matchMood && matchText;
            })
            .map(entry => {
              const mood = MOODS_MAP[entry.mood] || MOODS_MAP.happy;
              const dateStr = new Date(entry.created_at).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              });
              const isOwner = entry.author_id === user?.id;

              return (
                <View key={entry.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.moodBadge, { backgroundColor: mood.color + '40' }]}>
                      <Text style={{ fontSize: 16 }}>{mood.emoji}</Text>
                      <Text style={[styles.moodLabel, { color: COLORS.accentDeep }]}>{mood.label}</Text>
                    </View>
                    <Text style={styles.authorName}>
                      por {entry.author?.display_name || 'Parceiro'}
                    </Text>
                    {isOwner && (
                      <TouchableOpacity style={styles.delBtn} onPress={() => handleDeleteEntry(entry.id)}>
                        <Text style={{ fontSize: 14 }}>🗑️</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={styles.cardContent}>{entry.content}</Text>
                  <Text style={styles.cardDate}>{dateStr}</Text>
                </View>
              );
            })}

          {entries.filter(e => {
            const matchMood = selectedFilterMood === 'all' ? true : e.mood === selectedFilterMood;
            const matchText = !searchText.trim() || e.content.toLowerCase().includes(searchText.toLowerCase());
            return matchMood && matchText;
          }).length === 0 && (
            <Text style={styles.empty}>Nenhum registro encontrado nesta pesquisa. 📖</Text>
          )}
        </ScrollView>
      )}

      {/* Add Entry Modal Overlay */}
      {isAdding && (
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Novo Dia no Diário</Text>

            <Text style={styles.label}>Como você se sente hoje?</Text>
            <View style={styles.moodGrid}>
              {Object.keys(MOODS_MAP).map(key => {
                const item = MOODS_MAP[key as keyof typeof MOODS_MAP];
                const isSelected = selectedMood === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.moodSelector,
                      { backgroundColor: item.color + '25' },
                      isSelected && { borderColor: COLORS.accent, borderWidth: 1.5 },
                    ]}
                    onPress={() => setSelectedMood(key as any)}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 22 }}>{item.emoji}</Text>
                    <Text style={styles.selectorLabel}>{item.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>O que aconteceu ou quer registrar?</Text>
            <TextInput
              style={styles.input}
              placeholder="Escreva com carinho sobre o dia de hoje..."
              placeholderTextColor="#a69098"
              multiline
              numberOfLines={6}
              value={newContent}
              onChangeText={setNewContent}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => {
                  setIsAdding(false);
                  setNewContent('');
                  setSelectedMood('happy');
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn, (!newContent.trim() || submitting) && styles.saveDisabled]}
                onPress={handleAddEntry}
                disabled={!newContent.trim() || submitting}
                activeOpacity={0.7}
              >
                <Text style={styles.saveBtnText}>Registrar</Text>
              </TouchableOpacity>
            </View>
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
  addBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#fff', fontSize: 18 },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { fontSize: 13, color: COLORS.muted, marginTop: 12 },
  empty: { textAlign: 'center', color: COLORS.muted, paddingVertical: 80, fontSize: 13, paddingHorizontal: 40 },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12, paddingBottom: 30 },

  card: { backgroundColor: COLORS.surface, borderWidth: 0.5, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  moodBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 20 },
  moodLabel: { fontSize: 11.5, fontWeight: '500' },
  authorName: { fontSize: 11, color: COLORS.muted },
  delBtn: { marginLeft: 'auto', padding: 4 },

  cardContent: { fontSize: 14, color: COLORS.text, lineHeight: 22, marginVertical: 6 },
  cardDate: { fontSize: 10, color: COLORS.muted, alignSelf: 'flex-end', marginTop: 4 },

  /* Modal overlay */
  overlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(20, 10, 15, 0.45)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, zIndex: 99 },
  modal: { width: '100%', maxWidth: 360, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8 },
  modalTitle: { fontSize: 19, fontStyle: 'italic', color: COLORS.text, fontWeight: '500', marginBottom: 16, textAlign: 'center' },
  label: { fontSize: 12, fontWeight: '600', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  moodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  moodSelector: { width: '31%', aspectRatio: 1.1, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center', gap: 4, borderWidth: 1, borderColor: 'transparent' },
  selectorLabel: { fontSize: 10, color: COLORS.text, fontWeight: '500' },

  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: 12, fontSize: 14, color: COLORS.text, minHeight: 100, textAlignVertical: 'top', marginBottom: 20, backgroundColor: COLORS.bg },

  modalButtons: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  cancelBtn: { backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border },
  cancelBtnText: { fontSize: 13.5, fontWeight: '500', color: COLORS.muted },
  saveBtn: { backgroundColor: COLORS.accent },
  saveDisabled: { backgroundColor: COLORS.accentSoft, opacity: 0.7 },
  saveBtnText: { fontSize: 13.5, fontWeight: '500', color: '#ffffff' },

  /* Search & Filter Styles */
  filtersContainer: { backgroundColor: COLORS.surface, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  filtersScroll: { paddingHorizontal: 16, paddingVertical: 10, gap: 10 },
  filterChip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, borderWidth: 0.5, borderColor: COLORS.border, backgroundColor: COLORS.bg },
  filterChipActive: { backgroundColor: COLORS.headerBg, borderColor: COLORS.headerBg },
  filterText: { fontSize: 12.5, color: COLORS.muted },
  filterTextActive: { color: COLORS.headerAccent, fontWeight: '600' },
  searchContainer: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.bg, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  searchInput: { height: 38, borderWidth: 1, borderColor: COLORS.border, borderRadius: 19, paddingHorizontal: 16, fontSize: 13, color: COLORS.text, backgroundColor: COLORS.surface },
});
