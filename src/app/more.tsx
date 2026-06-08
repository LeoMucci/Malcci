import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { COLORS, RADIUS } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { router } from 'expo-router';

const ITEMS = [
  { k: 'map', icon: '🗺️', color: COLORS.accent, t: 'Mapa', s: 'Lugares visitados' },
  { k: 'gallery', icon: '📷', color: COLORS.gold, t: 'Galeria', s: 'Todas as fotos' },
  { k: 'diary', icon: '📖', color: COLORS.sage, t: 'Diário', s: 'Entradas do dia' },
  { k: 'movies', icon: '📺', color: COLORS.violet, t: 'Filmes', s: 'Assistir / assistidos' },
  { k: 'wishlist', icon: '🎁', color: COLORS.gold, t: 'Wishlist', s: 'Coisas legais' },
  { k: 'dates', icon: '💕', color: COLORS.accent, t: 'Datas', s: 'Lembretes especiais' },
  { k: 'activities', icon: '🎲', color: COLORS.blue, t: 'Sorteador', s: 'O que fazer?' },
  { k: 'polls', icon: '📊', color: COLORS.violet, t: 'Enquetes', s: 'Decidir juntos' },
  { k: 'notifications', icon: '🔔', color: COLORS.accent, t: 'Avisos', s: 'Notificações' },
  { k: 'stats', icon: '📈', color: COLORS.blue, t: 'Estatísticas', s: 'Resumo geral' },
  { k: 'timeline', icon: '📜', color: COLORS.sage, t: 'Timeline', s: 'Nossa história' },
];

export default function MoreScreen() {
  const { user, logout } = useAuth();

  const handlePress = (key: string) => {
    if (key === 'movies' || key === 'dates') {
      router.push('/plan');
    } else if (key === 'notifications') {
      router.push('/notifications');
    } else if (['map', 'gallery', 'diary', 'wishlist', 'activities', 'timeline'].includes(key)) {
      router.push(`/${key}` as any);
    } else {
      // stats, polls
      router.push(`/${key}` as any);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mais</Text>
        {user && (
          <View style={styles.userProfile}>
            <View style={[styles.miniAvatar, user.username === 'ela' ? styles.avatarLuysa : styles.avatarLeonardo]}>
              <Text style={styles.miniAvatarText}>{user.avatar}</Text>
            </View>
            <Text style={styles.userText}>{user.displayName}</Text>
            <TouchableOpacity onPress={logout} style={styles.logoutBtn} activeOpacity={0.7}>
              <Text style={styles.logoutText}>Sair</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {ITEMS.map(it => (
            <TouchableOpacity 
              key={it.k} 
              style={styles.card} 
              activeOpacity={0.7}
              onPress={() => handlePress(it.k)}
            >
              <Text style={{ fontSize: 25 }}>{it.icon}</Text>
              <View>
                <Text style={styles.cardTitle}>{it.t}</Text>
                <Text style={styles.cardSub}>{it.s}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    backgroundColor: COLORS.headerBg,
    paddingTop: 54, paddingHorizontal: 16, paddingBottom: 13,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 22, fontStyle: 'italic', fontWeight: '500', color: COLORS.headerText },
  userProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  miniAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLuysa: {
    backgroundColor: '#e6b3c5',
  },
  avatarLeonardo: {
    backgroundColor: '#b3c7dd',
  },
  miniAvatarText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.text,
  },
  userText: {
    fontSize: 13,
    color: COLORS.headerText,
    fontWeight: '500',
  },
  logoutBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 4,
  },
  logoutText: {
    fontSize: 11,
    color: COLORS.headerAccent,
    fontWeight: '500',
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 30 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 11 },
  card: {
    width: '48%',
    backgroundColor: COLORS.surface,
    borderWidth: 0.5, borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    padding: 16,
    gap: 8,
  },
  cardTitle: { fontSize: 14, color: COLORS.text, fontWeight: '500' },
  cardSub: { fontSize: 11, color: COLORS.muted },
});
