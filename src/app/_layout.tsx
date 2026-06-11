import { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { ToastProvider } from '@/components/ui/toast';
import { ConfirmProvider } from '@/components/ui/confirm';
import { registerForPush } from '@/lib/push';
import LoginScreen from '@/components/login-screen';

const TAB_ICONS: Record<string, string> = {
  home: '🏠',
  feed: '📸',
  plan: '📅',
  notes: '💌',
  more: '•••',
};

// Telas acessadas pela aba "Mais" — fazem parte do grupo de tabs mas ficam fora da barra.
const HIDDEN_SCREENS = [
  'diary',
  'wishlist',
  'activities',
  'gallery',
  'map',
  'timeline',
  'notifications',
  'polls',
  'stats',
];

function TabIcon({ icon, label, focused }: { icon: string; label: string; focused: boolean }) {
  return (
    <View style={styles.tabItem}>
      <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>{TAB_ICONS[icon] || '•'}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
      {focused && <View style={styles.tabDot} />}
    </View>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  // Registra o dispositivo para push quando o usuário entra (nativo apenas).
  useEffect(() => {
    if (user) void registerForPush(user.id);
  }, [user]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ focused }) => <TabIcon icon="home" label="início" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Feed',
          tabBarIcon: ({ focused }) => <TabIcon icon="feed" label="feed" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: 'Planos',
          tabBarIcon: ({ focused }) => <TabIcon icon="plan" label="planos" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="notes"
        options={{
          title: 'Recados',
          tabBarIcon: ({ focused }) => <TabIcon icon="notes" label="recados" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'Mais',
          tabBarIcon: ({ focused }) => <TabIcon icon="more" label="mais" focused={focused} />,
        }}
      />
      {HIDDEN_SCREENS.map(name => (
        <Tabs.Screen key={name} name={name} options={{ href: null }} />
      ))}
    </Tabs>
  );
}

export default function TabLayout() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ConfirmProvider>
          <AppContent />
        </ConfirmProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
  },
  tabBar: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border,
    height: Platform.OS === 'ios' ? 85 : 65,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    elevation: 0,
    shadowOpacity: 0,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabIcon: {
    fontSize: 20,
    opacity: 0.5,
  },
  tabIconActive: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 9.5,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    color: COLORS.muted,
  },
  tabLabelActive: {
    color: COLORS.accent,
  },
  tabDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.accent,
    marginTop: 2,
  },
});
