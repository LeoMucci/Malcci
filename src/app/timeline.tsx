import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { COLORS, RADIUS, MTYPE } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';

interface TimelineItem {
  id: string | number;
  title: string;
  date: Date;
  dateLabel: string;
  type: 'memory' | 'event';
  category: string;
  description?: string;
  author?: string;
}

export default function TimelineScreen() {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTimeline = async () => {
    setLoading(true);
    try {
      const combined: TimelineItem[] = [];

      // 1. Fetch memories
      const { data: mems } = await supabase
        .from('memories')
        .select('id, title, type, description, created_at, author:users(display_name)')
        .order('created_at', { ascending: false });

      if (mems) {
        mems.forEach(m => {
          combined.push({
            id: `m_${m.id}`,
            title: m.title,
            date: new Date(m.created_at),
            dateLabel: new Date(m.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }),
            type: 'memory',
            category: m.type,
            description: m.description || undefined,
            author: m.author?.display_name,
          });
        });
      }

      // 2. Fetch calendar events
      const { data: events } = await supabase
        .from('calendar_events')
        .select('id, title, category, description, event_date')
        .order('event_date', { ascending: false });

      if (events) {
        events.forEach(e => {
          combined.push({
            id: `e_${e.id}`,
            title: e.title,
            date: new Date(e.event_date + 'T12:00:00'),
            dateLabel: new Date(e.event_date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }),
            type: 'event',
            category: e.category,
            description: e.description || undefined,
          });
        });
      }

      // Sort combined array by date descending
      combined.sort((a, b) => b.date.getTime() - a.date.getTime());
      setItems(combined);
    } catch (e) {
      console.error('Failed to build timeline:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTimeline();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backText}>‹ Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nossa História</Text>
        <View style={{ width: 50 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Reescrevendo a linha do tempo...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.timelineContainer}>
            {/* Vertical Line Connector */}
            <View style={styles.verticalLine} />

            {items.map((item, index) => {
              const isEvent = item.type === 'event';
              const meta = isEvent ? null : MTYPE[item.category] || MTYPE.other;
              
              let badgeColor = COLORS.accent;
              let icon = '📸';

              if (isEvent) {
                icon = item.category === 'anniversary' ? '💕' : item.category === 'birthday' ? '🎂' : item.category === 'special' ? '⭐' : '📌';
                badgeColor = item.category === 'anniversary' ? COLORS.accent : item.category === 'birthday' ? COLORS.blue : item.category === 'special' ? COLORS.gold : COLORS.muted;
              } else if (meta) {
                icon = item.category === 'restaurant' ? '🍽️' : item.category === 'movie' ? '🎬' : item.category === 'place' ? '🏖️' : '✨';
                badgeColor = meta.color;
              }

              return (
                <View key={item.id} style={styles.timelineNode}>
                  {/* Timeline dot badge */}
                  <View style={[styles.timelineDot, { backgroundColor: badgeColor }]}>
                    <Text style={styles.dotIcon}>{icon}</Text>
                  </View>

                  {/* Content bubble */}
                  <View style={styles.timelineBubble}>
                    <Text style={styles.bubbleDate}>{item.dateLabel}</Text>
                    <Text style={styles.bubbleTitle}>{item.title}</Text>
                    {item.description ? (
                      <Text style={styles.bubbleDesc}>{item.description}</Text>
                    ) : null}
                    {!isEvent && item.author ? (
                      <Text style={styles.bubbleAuthor}>Registrado por {item.author}</Text>
                    ) : null}
                  </View>
                </View>
              );
            })}

            {items.length === 0 && (
              <Text style={styles.empty}>Nenhum momento registrado na nossa história ainda. Adicione memórias ou datas para começar! 🌱</Text>
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
