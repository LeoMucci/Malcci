import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { COLORS, RADIUS } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';

interface Activity {
  id: number;
  title: string;
  description?: string;
  category: 'date' | 'home' | 'adventure' | 'relax' | 'food' | 'culture' | 'sport' | 'other';
  difficulty: 'easy' | 'medium' | 'hard';
  estimated_time?: number;
}

interface ActivityHistoryItem {
  id: number;
  activity_id: number;
  sorted_at: string;
  done: boolean;
  done_at?: string;
  activity?: {
    title: string;
    category: string;
  };
}

const CATEGORIES_MAP = {
  date: { label: 'Encontro fora', emoji: '👩‍❤️‍👨', color: '#ffb3ba' },
  home: { label: 'Em casa', emoji: '🏠', color: '#caffbf' },
  adventure: { label: 'Aventura', emoji: '⛰️', color: '#ffd6a5' },
  relax: { label: 'Relaxar', emoji: '☕', color: '#bdb2ff' },
  food: { label: 'Comer', emoji: '🍕', color: '#ffc6ff' },
  culture: { label: 'Cultura', emoji: '🎨', color: '#a0c4ff' },
  sport: { label: 'Esportes', emoji: '🚴', color: '#fdffb6' },
  other: { label: 'Outro', emoji: '✨', color: '#eef1e6' },
};

const DIFFICULTY_MAP = {
  easy: { label: 'Fácil', color: '#52c41a' },
  medium: { label: 'Médio', color: '#faad14' },
  hard: { label: 'Difícil', color: '#ff4d4f' },
};

export default function ActivitiesScreen() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [history, setHistory] = useState<ActivityHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Selector state
  const [drawing, setDrawing] = useState(false);
  const [currentSelected, setCurrentSelected] = useState<Activity | null>(null);
  const [drawResult, setDrawResult] = useState<Activity | null>(null);

  // Form states
  const [isAdding, setIsAdding] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState<keyof typeof CATEGORIES_MAP>('date');
  const [formDiff, setFormDiff] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [formTime, setFormTime] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch activities
      const { data: actData, error: actErr } = await supabase
        .from('activities')
        .select('*');

      if (actErr) throw actErr;
      setActivities(actData || []);

      // 2. Fetch history
      const { data: histData, error: histErr } = await supabase
        .from('activity_history')
        .select(`
          *,
          activity:activities(title, category)
        `)
        .order('sorted_at', { ascending: false })
        .limit(10);

      if (histErr) throw histErr;
      setHistory(histData || []);
    } catch (e) {
      console.error('Failed to load activities:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDraw = () => {
    if (activities.length === 0) {
      Alert.alert('Sem atividades', 'Cadastre alguma atividade no sorteador antes de sortear!');
      return;
    }

    setDrawing(true);
    setDrawResult(null);

    let counter = 0;
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * activities.length);
      setCurrentSelected(activities[randomIndex]);
      counter++;

      if (counter > 15) {
        clearInterval(interval);
        const finalSelected = activities[Math.floor(Math.random() * activities.length)];
        setCurrentSelected(finalSelected);
        setDrawResult(finalSelected);
        setDrawing(false);
      }
    }, 120);
  };

  const handleSaveToHistory = async (activityId: number, doneStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('activity_history')
        .insert({
          activity_id: activityId,
          done: doneStatus,
          done_at: doneStatus ? new Date().toISOString() : null,
        });

      if (error) throw error;
      setDrawResult(null);
      loadData();
      Alert.alert('Sucesso!', doneStatus ? 'Atividade concluída com sucesso!' : 'Atividade salva no histórico.');
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddActivity = async () => {
    if (!formTitle.trim()) return;
    setSubmitting(true);

    const timeMin = formTime ? parseInt(formTime) : null;

    try {
      const { error } = await supabase
        .from('activities')
        .insert({
          title: formTitle,
          description: formDesc || null,
          category: formCategory,
          difficulty: formDiff,
          estimated_time: timeMin,
        });

      if (error) throw error;

      setFormTitle('');
      setFormDesc('');
      setFormCategory('date');
      setFormDiff('medium');
      setFormTime('');
      setIsAdding(false);
      loadData();
    } catch (e) {
      console.error(e);
      Alert.alert('Erro', 'Não foi possível cadastrar a atividade.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backText}>‹ Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sorteador de Casal</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setIsAdding(true)} activeOpacity={0.7}>
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Carregando atividades...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Main Draw Panel */}
          <View style={styles.drawCard}>
            <Text style={styles.drawCardLabel}>💡 O QUE FAREMOS HOJE?</Text>
            
            {drawing || currentSelected ? (
              <View style={styles.resultBox}>
                <Text style={styles.resultEmoji}>
                  {CATEGORIES_MAP[currentSelected?.category || 'other'].emoji}
                </Text>
                <Text style={styles.resultTitle}>{currentSelected?.title}</Text>
                {currentSelected?.description && !drawing ? (
                  <Text style={styles.resultDesc}>{currentSelected.description}</Text>
                ) : null}

                {!drawing && currentSelected && (
                  <View style={styles.resultSpecs}>
                    <Text style={styles.specItem}>⏱️ {currentSelected.estimated_time ? `${currentSelected.estimated_time}m` : 'N/A'}</Text>
                    <Text style={[styles.specItem, { color: DIFFICULTY_MAP[currentSelected.difficulty].color }]}>
                      ⭐ {DIFFICULTY_MAP[currentSelected.difficulty].label}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.emptyBox}>
                <Text style={{ fontSize: 50 }}>🎲</Text>
                <Text style={styles.emptyBoxTitle}>Está no tédio?</Text>
                <Text style={styles.emptyBoxSub}>Deixe o sorteador escolher uma atividade legal para vocês dois hoje!</Text>
              </View>
            )}

            {drawResult && !drawing && (
              <View style={styles.resultActions}>
                <TouchableOpacity 
                  style={[styles.resultBtn, { backgroundColor: COLORS.sage }]}
                  onPress={() => handleSaveToHistory(drawResult.id, true)}
                >
                  <Text style={styles.resultBtnText}>Fazer Agora! ✓</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.resultBtn, { backgroundColor: COLORS.muted }]}
                  onPress={() => setDrawResult(null)}
                >
                  <Text style={styles.resultBtnText}>Sortear Outro ↺</Text>
                </TouchableOpacity>
              </View>
            )}

            {!drawing && !drawResult && (
              <TouchableOpacity style={styles.drawButton} onPress={handleDraw} activeOpacity={0.85}>
                <Text style={styles.drawButtonText}>SORTEAR 🎲</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* History Section */}
          <Text style={styles.secLabel}>Histórico de Conclusões</Text>
          {history.map(item => {
            const dateStr = new Date(item.sorted_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
            const cat = CATEGORIES_MAP[item.activity?.category as keyof typeof CATEGORIES_MAP] || CATEGORIES_MAP.other;
            return (
              <View key={item.id} style={styles.historyCard}>
                <Text style={{ fontSize: 18 }}>{cat.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyTitle}>{item.activity?.title || 'Atividade Excluída'}</Text>
                  <Text style={styles.historySub}>Sorteado em {dateStr} {item.done ? '· Concluído! ✅' : ''}</Text>
                </View>
              </View>
            );
          })}

          {history.length === 0 && (
            <Text style={styles.empty}>Nenhuma atividade concluída ainda. Sorteie e divirtam-se! 🌟</Text>
          )}
        </ScrollView>
      )}

      {/* Add Custom Activity Modal Overlay */}
      {isAdding && (
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Sugerir Atividade</Text>

            <Text style={styles.label}>Título da Atividade</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: Fazer fondue na sala, Trilha no pôr do sol..."
              value={formTitle}
              onChangeText={setFormTitle}
            />

            <Text style={styles.label}>Instruções/Descrição (Opcional)</Text>
            <TextInput
              style={[styles.modalInput, { minHeight: 50, textAlignVertical: 'top' }]}
              placeholder="Ex: Comprar chocolate belga, morangos e marshmallows..."
              multiline
              numberOfLines={2}
              value={formDesc}
              onChangeText={setFormDesc}
            />

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.label}>Duração (minutos)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Ex: 60"
                  keyboardType="numeric"
                  value={formTime}
                  onChangeText={setFormTime}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Dificuldade</Text>
                <View style={styles.diffRow}>
                  {Object.keys(DIFFICULTY_MAP).map(k => (
                    <TouchableOpacity
                      key={k}
                      style={[
                        styles.diffChip,
                        formDiff === k && { backgroundColor: DIFFICULTY_MAP[k as keyof typeof DIFFICULTY_MAP].color },
                      ]}
                      onPress={() => setFormDiff(k as any)}
                    >
                      <Text style={[styles.diffChipText, formDiff === k && { color: '#fff' }]}>
                        {DIFFICULTY_MAP[k as keyof typeof DIFFICULTY_MAP].label.slice(0, 1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <Text style={styles.label}>Categoria</Text>
            <View style={styles.typeGrid}>
              {Object.keys(CATEGORIES_MAP).map(key => {
                const item = CATEGORIES_MAP[key as keyof typeof CATEGORIES_MAP];
                const isSelected = formCategory === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.typeButton, isSelected && styles.typeButtonSelected, { minWidth: '45%' }]}
                    onPress={() => setFormCategory(key as any)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.typeButtonText, isSelected && styles.typeButtonTextSelected]}>
                      {item.emoji} {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => {
                  setIsAdding(false);
                  setFormTitle('');
                  setFormDesc('');
                  setFormCategory('date');
                  setFormDiff('medium');
                  setFormTime('');
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn, (!formTitle.trim() || submitting) && styles.saveDisabled]}
                onPress={handleAddActivity}
                disabled={!formTitle.trim() || submitting}
                activeOpacity={0.7}
              >
                <Text style={styles.saveBtnText}>Sugestionar</Text>
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
  empty: { textAlign: 'center', color: COLORS.muted, paddingVertical: 40, fontSize: 13, paddingHorizontal: 40 },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16, paddingBottom: 30 },

  /* Draw panel */
  drawCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 0.5, borderColor: COLORS.border, padding: 20, alignItems: 'center', gap: 16 },
  drawCardLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 1.5, color: COLORS.muted },
  emptyBox: { alignItems: 'center', gap: 10, paddingVertical: 24 },
  emptyBoxTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, fontStyle: 'italic' },
  emptyBoxSub: { fontSize: 12.5, color: COLORS.muted, textAlign: 'center', lineHeight: 18, paddingHorizontal: 20 },

  resultBox: { alignItems: 'center', gap: 8, paddingVertical: 16, width: '100%' },
  resultEmoji: { fontSize: 50 },
  resultTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text, textAlign: 'center' },
  resultDesc: { fontSize: 13, color: COLORS.muted, textAlign: 'center', paddingHorizontal: 20, lineHeight: 18 },
  resultSpecs: { flexDirection: 'row', gap: 14, marginTop: 6 },
  specItem: { fontSize: 11, fontWeight: '600', color: COLORS.muted, textTransform: 'uppercase' },

  resultActions: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 8 },
  resultBtn: { flex: 1, paddingVertical: 12, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  resultBtnText: { color: '#fff', fontSize: 13.5, fontWeight: '600' },

  drawButton: { width: '100%', backgroundColor: COLORS.accent, paddingVertical: 14, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center', shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  drawButtonText: { color: '#fff', fontSize: 15, fontWeight: 'bold', letterSpacing: 1 },

  secLabel: { fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase', color: '#b59aa1', marginTop: 10 },
  historyCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.surface, borderWidth: 0.5, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: 12 },
  historyTitle: { fontSize: 14, color: COLORS.text, fontWeight: '500' },
  historySub: { fontSize: 11, color: COLORS.muted, marginTop: 3 },

  /* Modal styles */
  overlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(20, 10, 15, 0.45)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, zIndex: 99 },
  modal: { width: '100%', maxWidth: 360, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8 },
  modalTitle: { fontSize: 19, fontStyle: 'italic', color: COLORS.text, fontWeight: '500', marginBottom: 16, textAlign: 'center' },
  label: { fontSize: 11, fontWeight: '600', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  modalInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: 10, fontSize: 14, color: COLORS.text, marginBottom: 12, backgroundColor: COLORS.bg, width: '100%' },
  row: { flexDirection: 'row' },
  diffRow: { flexDirection: 'row', gap: 4, height: 40, alignItems: 'center' },
  diffChip: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  diffChipText: { fontSize: 11, fontWeight: 'bold', color: COLORS.muted },

  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 18 },
  typeButton: { width: '48%', backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, paddingVertical: 8, alignItems: 'center' },
  typeButtonSelected: { backgroundColor: COLORS.headerBg, borderColor: COLORS.headerBg },
  typeButtonText: { fontSize: 11, color: COLORS.muted, fontWeight: '500' },
  typeButtonTextSelected: { color: COLORS.headerAccent, fontWeight: '600' },

  modalButtons: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  cancelBtn: { backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border },
  cancelBtnText: { fontSize: 13.5, fontWeight: '500', color: COLORS.muted },
  saveBtn: { backgroundColor: COLORS.accent },
  saveDisabled: { backgroundColor: COLORS.accentSoft, opacity: 0.7 },
  saveBtnText: { fontSize: 13.5, fontWeight: '500', color: '#ffffff' },
});
