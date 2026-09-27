// Supabase client. The publishable key is public by design; RLS and token-checking functions protect data.
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as Crypto from 'expo-crypto';
import { AppState, Platform } from 'react-native';

export const SUPABASE_URL = 'https://kpkezoyxujilfvdxllgo.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_mG-kXYFLOwC0pcF602kWfw_bwmVhHQL';
export const WEB_URL = 'https://coachflow-cyan.vercel.app';
export const PHOTO_BUCKET = 'report-photos';

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (s) => {
    if (s === 'active') sb.auth.startAutoRefresh();
    else sb.auth.stopAutoRefresh();
  });
}

export function uuid(): string {
  return Crypto.randomUUID();
}
