import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { COLORS, RADIUS } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';

interface AppNotification {
  id: number;
  type: 'new_memory' | 'new_comment' | 'new_message' | 'birthday' | 'anniversary' | 'special_date' | 'suggestion';
  title: string;
  description: string;
  read: boolean;
  created_at: string;
}

const TYPE_MAP = {
  new_memory: { icon: '📸', label: 'Nova Memória', color: COLORS.accent, bg: COLORS.accentSoft },
  new_comment: { icon: '💬', label: 'Comentário', color: COLORS.sage, bg: '#e6f4ea' },
  new_message: { icon: '💌', label: 'Recado', color: COLORS.blue, bg: '#e3f2fd' },
  birthday: { icon: '🎂', label: 'Aniversário', color: COLORS.gold, bg: COLORS.goldSoft },
  anniversary: { icon: '💕', label: 'Aniversário de Namoro', color: COLORS.accent, bg: COLORS.accentSoft },
  special_date: { icon: '🎉', label: 'Data Especial', color: COLORS.violet, bg: '#eee9fb' },
  suggestion: { icon: '💡', label: 'Sugestão', color: COLORS.gold, bg: COLORS.goldSoft },
};

function formatRelativeTime(dateStr: string) {
  const dateObj = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffMin = Math.floor(diffMs / (1000 * 60));
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'Agora mesmo';
  if (diffMin < 60) return `Há ${diffMin}m`;
  if (diffHr < 24) return `Há ${diffHr}h`;
  if (diffDays === 1) return 'Ontem';
  return dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export default function NotificationsScreen() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (e) {
      console.error('Failed to load notifications:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [user]);

  const markAsRead = async (id: number) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);

      if (error) throw error;
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (e) {
      console.error('Failed to mark notification as read:', e);
    }
  };

  const clearAll = async () => {
    if (!user || notifications.length === 0) return;
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
      setNotifications([]);
    } catch (e) {
      console.error('Failed to clear notifications:', e);
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
        <Text style={styles.headerTitle}>Avisos & Notificações</Text>
        {notifications.length > 0 ? (
          <TouchableOpacity onPress={clearAll} activeOpacity={0.7}>
            <Text style={styles.clearText}>Limpar</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 45 }} />
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Buscando avisos...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {notifications.map(n => {
            const config = TYPE_MAP[n.type] || TYPE_MAP.suggestion;
            return (
              <TouchableOpacity
                key={n.id}
                style={[styles.card, !n.read && styles.cardUnread]}
                onPress={() => markAsRead(n.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.iconBox, { backgroundColor: config.bg }]}>
                  <Text style={{ fontSize: 18 }}>{config.icon}</Text>
                </View>

                <View style={{ flex: 1, gap: 3 }}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardType}>{config.label}</Text>
                    <Text style={styles.cardTime}>{formatRelativeTime(n.created_at)}</Text>
                  </View>
                  <Text style={[styles.cardTitle, !n.read && styles.cardTitleUnread]}>{n.title}</Text>
                  {n.description ? (
                    <Text style={styles.cardDesc}>{n.description}</Text>
                  ) : null}
                </View>

                {!n.read && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            );
          })}

          {notifications.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={{ fontSize: 44, marginBottom: 12 }}>🔔</Text>
              <Text style={styles.emptyTitle}>Tudo calmo por aqui!</Text>
              <Text style={styles.emptyText}>Você não tem nenhum aviso ou lembrete novo no momento.</Text>
            </View>
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
  clearText: { color: COLORS.headerAccent, fontSize: 13, fontWeight: '500' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { fontSize: 13, color: COLORS.muted, marginTop: 12 },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12, paddingBottom: 30 },

  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    padding: 14,
    position: 'relative',
  },
  cardUnread: {
    borderColor: 'rgba(200, 90, 124, 0.25)',
    backgroundColor: 'rgba(200, 90, 124, 0.02)',
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  cardType: {
    fontSize: 9.5,
    fontWeight: '700',
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  cardTime: {
    fontSize: 10,
    color: COLORS.muted,
  },
  cardTitle: {
    fontSize: 14.5,
    color: COLORS.text,
    fontWeight: '500',
    marginTop: 2,
  },
  cardTitleUnread: {
    fontWeight: '700',
  },
  cardDesc: {
    fontSize: 12.5,
    color: '#6c565d',
    lineHeight: 18,
    marginTop: 2,
  },
  unreadDot: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: COLORS.accent,
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 120,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    fontStyle: 'italic',
  },
  emptyText: {
    fontSize: 12.5,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
  },
});
