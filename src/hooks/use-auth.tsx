import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export interface User {
  id: number;
  username: 'eu' | 'ela';
  displayName: string;
  nickname: string;
  avatar: string;
  avatarUrl?: string | null;
}

export const MOCK_USERS: Record<'eu' | 'ela', User> = {
  ela: {
    id: 1,
    username: 'ela',
    displayName: 'Luysa',
    nickname: 'MomoIquilinhaNinda',
    avatar: 'L',
    avatarUrl: null,
  },
  eu: {
    id: 2,
    username: 'eu',
    displayName: 'Leonardo',
    nickname: 'Momobolofofo',
    avatar: 'L',
    avatarUrl: null,
  },
};

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: 'eu' | 'ela') => Promise<void>;
  logout: () => Promise<void>;
  updateAvatarUrl: (url: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDbUser = async (username: 'eu' | 'ela', defaultUser: User): Promise<User> => {
    if (!isSupabaseConfigured) return defaultUser;
    try {
      const { data, error } = await supabase
        .from('users')
        .select('display_name, avatar_url')
        .eq('username', username)
        .maybeSingle();

      if (error) {
        console.warn('Failed to fetch user database details (might be missing avatar_url column):', error);
        return defaultUser;
      }
      if (data) {
        return {
          ...defaultUser,
          displayName: data.display_name || defaultUser.displayName,
          avatarUrl: (data as any).avatar_url || null,
        };
      }
    } catch (err) {
      console.warn('Error fetching user database details:', err);
    }
    return defaultUser;
  };

  useEffect(() => {
    async function loadStorageData() {
      try {
        const storedUser = await AsyncStorage.getItem('@couple_app_user');
        if (storedUser) {
          const parsed = JSON.parse(storedUser) as 'eu' | 'ela';
          const defaultUser = MOCK_USERS[parsed];
          if (defaultUser) {
            setUser(defaultUser);
            // Sincroniza em background
            const synced = await fetchDbUser(parsed, defaultUser);
            setUser(synced);
          }
        }
      } catch (e) {
        console.error('Failed to load auth user from AsyncStorage', e);
      } finally {
        setLoading(false);
      }
    }

    loadStorageData();
  }, []);

  const login = async (username: 'eu' | 'ela') => {
    try {
      const defaultUser = MOCK_USERS[username];
      await AsyncStorage.setItem('@couple_app_user', JSON.stringify(username));
      setUser(defaultUser);
      // Sincroniza com o Supabase
      const synced = await fetchDbUser(username, defaultUser);
      setUser(synced);
    } catch (e) {
      console.error('Failed to save auth user to AsyncStorage', e);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('@couple_app_user');
      setUser(null);
    } catch (e) {
      console.error('Failed to clear auth user from AsyncStorage', e);
    }
  };

  const updateAvatarUrl = async (url: string) => {
    if (!user) return;
    setUser(prev => prev ? { ...prev, avatarUrl: url } : null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateAvatarUrl }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
