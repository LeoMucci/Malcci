import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { COLORS } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import LoginScreen from '@/components/login-screen';
import { supabase } from '@/lib/supabase';
import { useEffect } from 'react';

function TabIcon({ icon, label, focused }: { icon: string; label: string; focused: boolean }) {
  const iconMap: Record<string, string> = {
    home: '🏠',
    feed: '📸',
    plan: '📅',
    notes: '💌',
    more: '•••',
  };
  return (
    <View style={styles.tabItem}>
      <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>{iconMap[icon] || '•'}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
      {focused && <View style={styles.tabDot} />}
    </View>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  useEffect(() => {
    async function syncDatabaseUserNames() {
      try {
        const isUrlConfigured = process.env.EXPO_PUBLIC_SUPABASE_URL && !process.env.EXPO_PUBLIC_SUPABASE_URL.includes('your-project-id');
        const isKeyConfigured = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY && !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY.includes('your-anon-key-here');
        if (isUrlConfigured && isKeyConfigured) {
          // Check user 1 (should be Luysa, was Ana)
          const { data: user1 } = await supabase.from('users').select('display_name').eq('id', 1).single();
          if (user1 && user1.display_name === 'Ana') {
            await supabase.from('users').update({ display_name: 'Luysa' }).eq('id', 1);
            console.log('Renamed database user 1 from Ana to Luysa');
          }
          // Check user 2 (should be Leonardo, was Rafael)
          const { data: user2 } = await supabase.from('users').select('display_name').eq('id', 2).single();
          if (user2 && user2.display_name === 'Rafael') {
            await supabase.from('users').update({ display_name: 'Leonardo' }).eq('id', 2);
            console.log('Renamed database user 2 from Rafael to Leonardo');
          }
        }
      } catch (e) {
        console.error('Failed to sync database user names:', e);
      }
    }
    if (user) {
      syncDatabaseUserNames();
    }
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
      <Tabs.Screen
        name="diary"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="wishlist"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="activities"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="gallery"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="timeline"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="polls"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  return (
    <AuthProvider>
      <AppContent />
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

