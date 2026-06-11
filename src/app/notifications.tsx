import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { COLORS, RADIUS } from '@/constants/theme';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/hooks/use-auth';
import { useRealtimeRefresh } from '@/hooks/use-realtime';
import { getErrorMessage } from '@/lib/errors';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { NOTIFS } from '@/constants/data';
import type { NotificationRow } from '@/types/domain';

interface NotificationMeta {
  icon: string;
  label: string;
  color: string;
  bg: string;
}

const TYPE_META: Record<string, NotificationMeta> = {
  new_memory: { icon: '📸', label: 'Nova Memória', color: COLORS.accent, bg: COLORS.accentSoft },
  new_comment: { icon: '💬', label: 'Comentário', color: COLORS.sage, bg: '#e6f4ea' },
  new_message: { icon: '💌', label: 'Recado', color: COLORS.blue, bg: '#e3f2fd' },
  birthday: { icon: '🎂', label: 'Aniversário', color: COLORS.gold, bg: COLORS.goldSoft },
  anniversary: { icon: '💕', label: 'Aniversário de Namoro', color: COLORS.accent, bg: COLORS.accentSoft },
  special_date: { icon: '🎉', label: 'Data Especial', color: COLORS.violet, bg: '#eee9fb' },
  suggestion: { icon: '💡', label: 'Sugestão', color: COLORS.gold, bg: COLORS.goldSoft },
};

function getTypeMeta(type: string): NotificationMeta {
  return TYPE_META[type] ?? TYPE_META.suggestion;
}

function formatRelativeTime(dateStr: string): string {
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

// Fallback local (modo demonstração) mapeado para o formato do banco.
const MOCK_TYPE_BY_ICON: Record<string, string> = {
  cake: 'birthday',
  movie: 'suggestion',
  restaurant: 'suggestion',
};

const MOCK_NOTIFICATIONS: NotificationRow[] = NOTIFS.map((item, index) => ({
  id: -(index + 1),
  user_id: 0,
  type: MOCK_TYPE_BY_ICON[item.icon] ?? 'suggestion',
  title: item.title,
  description: item.text,
  related_id: null,
  read: false,
  created_at: new Date().toISOString(),
}));

export default function NotificationsScreen() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    if (!isSupabaseConfigured) {
      setNotifications(MOCK_NOTIFICATIONS);
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications((data as NotificationRow[] | null) ?? []);
    } catch (e) {
      showToast(getErrorMessage(e, 'Não foi possível carregar os avisos.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  useRealtimeRefresh(['notifications'], loadNotifications);

  const markAsRead = useCallback(
    async (id: number) => {
      if (!isSupabaseConfigured) {
        setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
        return;
      }
      try {
        const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
        if (error) throw error;
        setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
      } catch (e) {
        showToast(getErrorMessage(e, 'Não foi possível marcar o aviso como lido.'), 'error');
      }
    },
    [showToast],
  );

  const handleClearAll = useCallback(async () => {
    if (!user || notifications.length === 0) return;
    if (!isSupabaseConfigured) {
      setNotifications([]);
      return;
    }
    try {
      const { error } = await supabase.from('notifications').delete().eq('user_id', user.id);
      if (error) throw error;
      setNotifications([]);
      showToast('Avisos limpos.', 'success');
    } catch (e) {
      showToast(getErrorMessage(e, 'Não foi possível limpar os avisos.'), 'error');
    }
  }, [user, notifications.length, showToast]);

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
          <TouchableOpacity onPress={handleClearAll} activeOpacity={0.7}>
            <Text style={styles.clearText}>Limpar</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
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
            const config = getTypeMeta(n.type);
            return (
              <TouchableOpacity
                key={n.id}
                style={[styles.card, !n.read && styles.cardUnread]}
                onPress={() => markAsRead(n.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.iconBox, { backgroundColor: config.bg }]}>
                  <Text style={styles.iconText}>{config.icon}</Text>
                </View>

                <View style={styles.cardContent}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardType}>{config.label}</Text>
                    <Text style={styles.cardTime}>{formatRelativeTime(n.created_at)}</Text>
                  </View>
                  <Text style={[styles.cardTitle, !n.read && styles.cardTitleUnread]}>{n.title}</Text>
                  {n.description ? <Text style={styles.cardDesc}>{n.description}</Text> : null}
                </View>

                {!n.read && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            );
          })}

          {notifications.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🔔</Text>
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
  headerSpacer: { width: 45 },
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
  iconBox: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 18 },
  cardContent: { flex: 1, gap: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
  cardType: { fontSize: 9.5, fontWeight: '700', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.8 },
  cardTime: { fontSize: 10, color: COLORS.muted },
  cardTitle: { fontSize: 14.5, color: COLORS.text, fontWeight: '500', marginTop: 2 },
  cardTitleUnread: { fontWeight: '700' },
  cardDesc: { fontSize: 12.5, color: '#6c565d', lineHeight: 18, marginTop: 2 },
  unreadDot: { position: 'absolute', top: 14, right: 14, width: 7, height: 7, borderRadius: 3.5, backgroundColor: COLORS.accent },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 120, paddingHorizontal: 40 },
  emptyEmoji: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.text, fontStyle: 'italic' },
  emptyText: { fontSize: 12.5, color: COLORS.muted, textAlign: 'center', lineHeight: 18, marginTop: 6 },
});
