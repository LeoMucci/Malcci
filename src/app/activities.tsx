import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { COLORS, RADIUS } from '@/constants/theme';
import { useToast } from '@/components/ui/toast';
import { useRealtimeRefresh } from '@/hooks/use-realtime';
import { getErrorMessage } from '@/lib/errors';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { ACTIVITIES } from '@/constants/data';
import type { ActivityRow, ActivityHistoryRow } from '@/types/domain';
import { getCategoryMeta, getDifficultyMeta, type ActivityCategoryKey } from '@/features/activities/constants';
import { ActivityFormModal, type ActivityFormInput } from '@/features/activities/activity-form-modal';

const DRAW_SPINS = 16;
const DRAW_TICK_MS = 120;
const HISTORY_LIMIT = 10;

// Fallback local (modo demonstração) mapeado para o formato do banco.
const MOCK_CATEGORY_BY_LABEL: Record<string, ActivityCategoryKey> = {
  'Em casa': 'home',
  Date: 'date',
  Relax: 'relax',
  Aventura: 'adventure',
  Cultura: 'culture',
};

function parseMockMinutes(time: string): number | null {
  const value = Number.parseInt(time, 10);
  if (!Number.isFinite(value) || value <= 0) return null;
  return time.includes('h') ? value * 60 : value;
}

const MOCK_ACTIVITIES: ActivityRow[] = ACTIVITIES.map((item, index) => ({
  id: -(index + 1),
  title: item.title,
  description: null,
  category: MOCK_CATEGORY_BY_LABEL[item.cat] ?? 'other',
  difficulty: item.diff === 'Médio' ? 'medium' : 'easy',
  estimated_time: parseMockMinutes(item.time),
}));

export default function ActivitiesScreen() {
  const { showToast } = useToast();
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [history, setHistory] = useState<ActivityHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Selector state
  const [drawing, setDrawing] = useState(false);
  const [currentSelected, setCurrentSelected] = useState<ActivityRow | null>(null);
  const [drawResult, setDrawResult] = useState<ActivityRow | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const drawTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(
    () => () => {
      if (drawTimer.current) clearInterval(drawTimer.current);
    },
    [],
  );

  const loadData = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setActivities(MOCK_ACTIVITIES);
      setHistory([]);
      setLoading(false);
      return;
    }
    try {
      const { data: actData, error: actErr } = await supabase.from('activities').select('*');
      if (actErr) throw actErr;
      setActivities((actData as ActivityRow[] | null) ?? []);

      const { data: histData, error: histErr } = await supabase
        .from('activity_history')
        .select('*, activity:activities(title, category)')
        .order('sorted_at', { ascending: false })
        .limit(HISTORY_LIMIT);

      if (histErr) throw histErr;
      setHistory((histData as ActivityHistoryRow[] | null) ?? []);
    } catch (e) {
      showToast(getErrorMessage(e, 'Não foi possível carregar as atividades.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useRealtimeRefresh(['activities', 'activity_history'], loadData);

  const handleDraw = useCallback(() => {
    if (activities.length === 0) {
      showToast('Cadastre alguma atividade no sorteador antes de sortear!', 'info');
      return;
    }

    setDrawing(true);
    setDrawResult(null);
    if (drawTimer.current) clearInterval(drawTimer.current);

    let counter = 0;
    drawTimer.current = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * activities.length);
      setCurrentSelected(activities[randomIndex]);
      counter += 1;

      if (counter > DRAW_SPINS) {
        if (drawTimer.current) clearInterval(drawTimer.current);
        drawTimer.current = null;
        const finalSelected = activities[Math.floor(Math.random() * activities.length)];
        setCurrentSelected(finalSelected);
        setDrawResult(finalSelected);
        setDrawing(false);
      }
    }, DRAW_TICK_MS);
  }, [activities, showToast]);

  const handleSaveToHistory = useCallback(
    async (activityId: number, doneStatus: boolean) => {
      if (!isSupabaseConfigured) {
        showToast('Modo demonstração: o histórico não foi salvo.', 'info');
        setDrawResult(null);
        return;
      }
      try {
        const { error } = await supabase.from('activity_history').insert({
          activity_id: activityId,
          done: doneStatus,
          done_at: doneStatus ? new Date().toISOString() : null,
        });

        if (error) throw error;
        setDrawResult(null);
        showToast(doneStatus ? 'Atividade concluída com sucesso!' : 'Atividade salva no histórico.', 'success');
        void loadData();
      } catch (e) {
        showToast(getErrorMessage(e, 'Não foi possível salvar no histórico.'), 'error');
      }
    },
    [showToast, loadData],
  );

  const handleSubmitActivity = useCallback(
    async (input: ActivityFormInput): Promise<boolean> => {
      if (!isSupabaseConfigured) {
        showToast('Modo demonstração: a atividade não foi salva.', 'info');
        return true;
      }
      try {
        const { error } = await supabase.from('activities').insert({
          title: input.title,
          description: input.description,
          category: input.category,
          difficulty: input.difficulty,
          estimated_time: input.estimated_time,
        });

        if (error) throw error;
        showToast('Atividade cadastrada! 🎲', 'success');
        void loadData();
        return true;
      } catch (e) {
        showToast(getErrorMessage(e, 'Não foi possível cadastrar a atividade.'), 'error');
        return false;
      }
    },
    [showToast, loadData],
  );

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
                <Text style={styles.resultEmoji}>{getCategoryMeta(currentSelected?.category).emoji}</Text>
                <Text style={styles.resultTitle}>{currentSelected?.title}</Text>
                {currentSelected?.description && !drawing ? (
                  <Text style={styles.resultDesc}>{currentSelected.description}</Text>
                ) : null}

                {!drawing && currentSelected && (
                  <View style={styles.resultSpecs}>
                    <Text style={styles.specItem}>
                      ⏱️ {currentSelected.estimated_time ? `${currentSelected.estimated_time}m` : 'N/A'}
                    </Text>
                    <Text style={[styles.specItem, { color: getDifficultyMeta(currentSelected.difficulty).color }]}>
                      ⭐ {getDifficultyMeta(currentSelected.difficulty).label}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyBoxEmoji}>🎲</Text>
                <Text style={styles.emptyBoxTitle}>Está no tédio?</Text>
                <Text style={styles.emptyBoxSub}>Deixe o sorteador escolher uma atividade legal para vocês dois hoje!</Text>
              </View>
            )}

            {drawResult && !drawing && (
              <View style={styles.resultActions}>
                <TouchableOpacity
                  style={[styles.resultBtn, styles.resultBtnDone]}
                  onPress={() => handleSaveToHistory(drawResult.id, true)}
                >
                  <Text style={styles.resultBtnText}>Fazer Agora! ✓</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.resultBtn, styles.resultBtnRetry]} onPress={() => setDrawResult(null)}>
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
            const cat = getCategoryMeta(item.activity?.category);
            return (
              <View key={item.id} style={styles.historyCard}>
                <Text style={styles.historyEmoji}>{cat.emoji}</Text>
                <View style={styles.historyBody}>
                  <Text style={styles.historyTitle}>{item.activity?.title || 'Atividade Excluída'}</Text>
                  <Text style={styles.historySub}>
                    Sorteado em {dateStr} {item.done ? '· Concluído! ✅' : ''}
                  </Text>
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
      {isAdding && <ActivityFormModal onClose={() => setIsAdding(false)} onSubmit={handleSubmitActivity} />}
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
  emptyBoxEmoji: { fontSize: 50 },
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
  resultBtnDone: { backgroundColor: COLORS.sage },
  resultBtnRetry: { backgroundColor: COLORS.muted },
  resultBtnText: { color: '#fff', fontSize: 13.5, fontWeight: '600' },

  drawButton: { width: '100%', backgroundColor: COLORS.accent, paddingVertical: 14, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center', shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  drawButtonText: { color: '#fff', fontSize: 15, fontWeight: 'bold', letterSpacing: 1 },

  secLabel: { fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase', color: '#b59aa1', marginTop: 10 },
  historyCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.surface, borderWidth: 0.5, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: 12 },
  historyEmoji: { fontSize: 18 },
  historyBody: { flex: 1 },
  historyTitle: { fontSize: 14, color: COLORS.text, fontWeight: '500' },
  historySub: { fontSize: 11, color: COLORS.muted, marginTop: 3 },
});
