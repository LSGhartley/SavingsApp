import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';


// 1. Get these keys from your Supabase Dashboard -> Settings -> API
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://mxxzbjiisltzkanfhwvd.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;


if (!SUPABASE_ANON_KEY) {
  throw new Error('No authentication key found.');
}

export const supabase = Platform.OS === 'web'
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) :createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});