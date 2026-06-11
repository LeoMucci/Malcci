import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { COLORS, MTYPE, RADIUS } from '@/constants/theme';
import { RELATIONSHIP_START_ISO } from '@/constants/config';
import { FEED } from '@/constants/data';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { getErrorMessage } from '@/lib/errors';
import { useToast } from '@/components/ui/toast';
import type { AuthorRef, CalendarEventRow, MemoryType } from '@/types/domain';

// Linhas cruas vindas do Supabase (select reduzido de memories).
interface TimelineMemoryRow {
  id: number;
  title: string;
  type: MemoryType;
  description: string | null;
  created_at: string;
  author: AuthorRef | null;
}

// União discriminada dos itens exibidos na linha do tempo.
interface TimelineBaseItem {
  id: string;
  title: string;
  date: Date;
  dateLabel: string;
  description?: string;
}

interface TimelineMemoryItem extends TimelineBaseItem {
  kind: 'memory';
  category: MemoryType;
  author?: string;
}

interface TimelineEventItem extends TimelineBaseItem {
  kind: 'event';
  category: string | null;
}

type TimelineItem = TimelineMemoryItem | TimelineEventItem;

const EVENT_BADGES: Record<string, { icon: string; color: string }> = {
  anniversary: { icon: '💕', color: COLORS.accent },
  birthday: { icon: '🎂', color: COLORS.blue },
  special: { icon: '⭐', color: COLORS.gold },
};
const DEFAULT_EVENT_BADGE = { icon: '📌', color: COLORS.muted };

const MEMORY_ICONS: Record<string, string> = {
  restaurant: '🍽️',
  movie: '🎬',
  place: '🏖️',
};
const DEFAULT_MEMORY_ICON = '✨';

function getBadge(item: TimelineItem): { icon: string; color: string } {
  if (item.kind === 'event') {
    return EVENT_BADGES[item.category ?? ''] ?? DEFAULT_EVENT_BADGE;
  }
  const meta = MTYPE[item.category] ?? MTYPE.other;
  return { icon: MEMORY_ICONS[item.category] ?? DEFAULT_MEMORY_ICON, color: meta.color };
}

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function buildTimeline(memories: TimelineMemoryRow[], events: CalendarEventRow[]): TimelineItem[] {
  const memoryItems: TimelineItem[] = memories.map(memory => {
    const date = new Date(memory.created_at);
    return {
      id: `m_${memory.id}`,
      kind: 'memory',
      title: memory.title,
      date,
      dateLabel: formatDateLabel(date),
      category: memory.type,
      description: memory.description ?? undefined,
      author: memory.author?.display_name,
    };
  });

  const eventItems: TimelineItem[] = events.map(event => {
    const date = new Date(`${event.event_date}T12:00:00`);
    return {
      id: `e_${event.id}`,
      kind: 'event',
      title: event.title,
      date,
      dateLabel: formatDateLabel(date),
      category: event.category,
      description: event.description ?? undefined,
    };
  });

  return [...memoryItems, ...eventItems].sort((a, b) => b.date.getTime() - a.date.getTime());
}

// Fallback local quando o Supabase não está configurado.
const MOCK_MEMORY_DATES = ['2026-06-01', '2026-05-28', '2025-07-14', '2026-02-14'];

const MOCK_MEMORY_ROWS: TimelineMemoryRow[] = FEED.map((entry, index) => ({
  id: index + 1,
  title: entry.title,
  type: entry.cat as MemoryType,
  description: entry.desc,
  created_at: `${MOCK_MEMORY_DATES[index] ?? RELATIONSHIP_START_ISO}T12:00:00`,
  author: { display_name: entry.by },
}));

const MOCK_EVENT_ROWS: CalendarEventRow[] = [
  {
    id: 1,
    title: 'Início do namoro',
    description: 'O dia em que tudo começou 💕',
    event_date: RELATIONSHIP_START_ISO,
    category: 'anniversary',
  },
];

export default function TimelineScreen() {
  const { showToast } = useToast();
  const [memories, setMemories] = useState<TimelineMemoryRow[]>([]);
  const [events, setEvents] = useState<CalendarEventRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTimeline = useCallback(async () => {
    setLoading(true);

    if (!isSupabaseConfigured) {
      setMemories(MOCK_MEMORY_ROWS);
      setEvents(MOCK_EVENT_ROWS);
      setLoading(false);
      return;
    }

    try {
      const [memoriesResult, eventsResult] = await Promise.all([
        supabase
          .from('memories')
          .select('id, title, type, description, created_at, author:users(display_name)')
          .order('created_at', { ascending: false })
          .returns<TimelineMemoryRow[]>(),
        supabase
          .from('calendar_events')
          .select('id, title, category, description, event_date')
          .order('event_date', { ascending: false })
          .returns<CalendarEventRow[]>(),
      ]);

      if (memoriesResult.error) throw memoriesResult.error;
      if (eventsResult.error) throw eventsResult.error;

      setMemories(memoriesResult.data ?? []);
      setEvents(eventsResult.data ?? []);
    } catch (e) {
      showToast(getErrorMessage(e, 'Não foi possível carregar a linha do tempo.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadTimeline();
  }, [loadTimeline]);

  const items = useMemo(() => buildTimeline(memories, events), [memories, events]);

  const handleBack = useCallback(() => {
    router.back();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Cabeçalho */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
          <Text style={styles.backText}>‹ Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nossa História</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Reescrevendo a linha do tempo...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.timelineContainer}>
            {/* Linha vertical conectora */}
            <View style={styles.verticalLine} />

            {items.map(item => {
              const badge = getBadge(item);
              return (
                <View key={item.id} style={styles.timelineNode}>
                  {/* Marcador na linha do tempo */}
                  <View style={[styles.timelineDot, { backgroundColor: badge.color }]}>
                    <Text style={styles.dotIcon}>{badge.icon}</Text>
                  </View>

                  {/* Conteúdo */}
                  <View style={styles.timelineBubble}>
                    <Text style={styles.bubbleDate}>{item.dateLabel}</Text>
                    <Text style={styles.bubbleTitle}>{item.title}</Text>
                    {item.description ? (
                      <Text style={styles.bubbleDesc}>{item.description}</Text>
                    ) : null}
                    {item.kind === 'memory' && item.author ? (
                      <Text style={styles.bubbleAuthor}>Registrado por {item.author}</Text>
                    ) : null}
                  </View>
                </View>
              );
            })}

            {items.length === 0 && (
              <Text style={styles.empty}>
                Nenhum momento registrado na nossa história ainda. Adicione memórias ou datas para começar! 🌱
              </Text>
            )}
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
  headerSpacer: { width: 50 },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { fontSize: 13, color: COLORS.muted, marginTop: 12 },
  empty: { textAlign: 'center', color: COLORS.muted, paddingVertical: 80, fontSize: 13, paddingHorizontal: 40 },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingVertical: 24, paddingBottom: 50 },

  timelineContainer: { position: 'relative', width: '100%', paddingLeft: 12 },
  verticalLine: { position: 'absolute', left: 24, top: 4, bottom: 4, width: 2, backgroundColor: COLORS.border },

  timelineNode: { flexDirection: 'row', gap: 16, marginBottom: 20, alignItems: 'flex-start' },
  timelineDot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', zIndex: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
  dotIcon: { fontSize: 13, color: '#fff' },

  timelineBubble: { flex: 1, backgroundColor: COLORS.surface, borderWidth: 0.5, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: 13, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  bubbleDate: { fontSize: 9.5, fontWeight: '600', letterSpacing: 0.5, color: COLORS.muted, textTransform: 'uppercase', marginBottom: 4 },
  bubbleTitle: { fontSize: 14.5, fontWeight: 'bold', color: COLORS.text },
  bubbleDesc: { fontSize: 13, color: '#554', lineHeight: 18, marginTop: 6 },
  bubbleAuthor: { fontSize: 10, color: COLORS.muted, marginTop: 8, fontStyle: 'italic' },
});
