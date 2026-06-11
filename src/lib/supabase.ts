import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

/** True quando as env vars do Supabase estão preenchidas com valores reais (não placeholders). */
export const isSupabaseConfigured: boolean =
  supabaseUrl.length > 0 &&
  supabaseAnonKey.length > 0 &&
  !supabaseUrl.includes('your-project-id') &&
  !supabaseAnonKey.includes('your-anon-key');

// Safe storage wrapper to prevent SSR (Server-Side Rendering) reference errors on Node.js
const safeStorage = {
  getItem: async (key: string) => {
    if (typeof window === 'undefined') {
      return null;
    }
    try {
      return await AsyncStorage.getItem(key);
    } catch (e) {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      console.error('safeStorage.setItem error:', e);
    }
  },
  removeItem: async (key: string) => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.error('safeStorage.removeItem error:', e);
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: safeStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
