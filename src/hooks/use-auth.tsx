import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface User {
  id: number;
  username: 'eu' | 'ela';
  displayName: string;
  avatar: string;
}

export const MOCK_USERS: Record<'eu' | 'ela', User> = {
  ela: {
    id: 1,
    username: 'ela',
    displayName: 'Luysa',
    avatar: 'L',
  },
  eu: {
    id: 2,
    username: 'eu',
    displayName: 'Leonardo',
    avatar: 'L',
  },
};

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: 'eu' | 'ela') => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStorageData() {
      try {
        const storedUser = await AsyncStorage.getItem('@couple_app_user');
        if (storedUser) {
          const parsed = JSON.parse(storedUser) as 'eu' | 'ela';
          if (MOCK_USERS[parsed]) {
            setUser(MOCK_USERS[parsed]);
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
      const selectedUser = MOCK_USERS[username];
      await AsyncStorage.setItem('@couple_app_user', JSON.stringify(username));
      setUser(selectedUser);
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

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
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
