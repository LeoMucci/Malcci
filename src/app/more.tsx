import { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router, type Href } from 'expo-router';
import { COLORS, RADIUS } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';

interface MenuItem {
  key: string;
  icon: string;
  title: string;
  subtitle: string;
  route: Href;
}

interface MenuSection {
  title: string;
  items: ReadonlyArray<MenuItem>;
}

const MENU_SECTIONS: ReadonlyArray<MenuSection> = [
  {
    title: 'Memórias',
    items: [
      { key: 'gallery', icon: '📷', title: 'Galeria', subtitle: 'Todas as fotos', route: '/gallery' },
      { key: 'map', icon: '🗺️', title: 'Mapa', subtitle: 'Lugares visitados', route: '/map' },
      { key: 'timeline', icon: '📜', title: 'Timeline', subtitle: 'Nossa história', route: '/timeline' },
    ],
  },
  {
    title: 'Juntos',
    items: [
      { key: 'diary', icon: '📖', title: 'Diário', subtitle: 'Entradas do dia', route: '/diary' },
      { key: 'polls', icon: '📊', title: 'Enquetes', subtitle: 'Decidir juntos', route: '/polls' },
      { key: 'activities', icon: '🎲', title: 'Sorteador', subtitle: 'O que fazer?', route: '/activities' },
      { key: 'wishlist', icon: '🎁', title: 'Wishlist', subtitle: 'Coisas legais', route: '/wishlist' },
    ],
  },
  {
    title: 'Planejamento',
    items: [
      { key: 'movies', icon: '📺', title: 'Filmes & Séries', subtitle: 'Assistir / assistidos', route: '/plan?tab=movies' },
      { key: 'dates', icon: '💕', title: 'Datas especiais', subtitle: 'Lembretes especiais', route: '/plan?tab=calendar' },
    ],
  },
  {
    title: 'Geral',
    items: [
      { key: 'stats', icon: '📈', title: 'Estatísticas', subtitle: 'Resumo geral', route: '/stats' },
      { key: 'notifications', icon: '🔔', title: 'Avisos', subtitle: 'Notificações', route: '/notifications' },
    ],
  },
];

export default function MoreScreen() {
  const { user, logout } = useAuth();

  const handleNavigate = useCallback((route: Href) => {
    router.push(route);
  }, []);

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
        {MENU_SECTIONS.map(section => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionLabel}>{section.title}</Text>
            <View style={styles.grid}>
              {section.items.map(item => (
                <TouchableOpacity
                  key={item.key}
                  style={styles.card}
                  activeOpacity={0.7}
                  onPress={() => handleNavigate(item.route)}
                >
                  <Text style={styles.cardIcon}>{item.icon}</Text>
                  <View>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardSub}>{item.subtitle}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
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
  scrollContent: { padding: 16, paddingBottom: 30, gap: 20 },
  section: { gap: 10 },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: '#b59aa1',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 11 },
  card: {
    width: '48%',
    backgroundColor: COLORS.surface,
    borderWidth: 0.5, borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    padding: 16,
    gap: 8,
  },
  cardIcon: { fontSize: 25 },
  cardTitle: { fontSize: 14, color: COLORS.text, fontWeight: '500' },
  cardSub: { fontSize: 11, color: COLORS.muted },
});
