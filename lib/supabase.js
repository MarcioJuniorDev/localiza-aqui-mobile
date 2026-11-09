import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY precisam estar definidas no arquivo .env ou nas variáveis de ambiente do Netlify.'
  );
}

if (typeof window === 'undefined') {
  globalThis.window = globalThis;
}

if (typeof localStorage === 'undefined') {
  const localStorageStore = {};

  globalThis.localStorage = {
    getItem: (key) => (key in localStorageStore ? localStorageStore[key] : null),
    setItem: (key, value) => {
      localStorageStore[key] = String(value);
    },
    removeItem: (key) => {
      delete localStorageStore[key];
    },
    clear: () => {
      Object.keys(localStorageStore).forEach((key) => delete localStorageStore[key]);
    },
  };
}

const createSupabaseStorage = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return {
      getItem: async (key) => window.localStorage.getItem(key),
      setItem: async (key, value) => window.localStorage.setItem(key, value),
      removeItem: async (key) => window.localStorage.removeItem(key),
    };
  }

  return AsyncStorage;
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: createSupabaseStorage(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});