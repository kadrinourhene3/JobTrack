import 'react-native-url-polyfill/auto';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

function configurationProblem(): string | null {
  if (!supabaseUrl && !supabaseAnonKey) return null;
  if (!supabaseUrl || !supabaseAnonKey) return 'Both Supabase environment variables are required.';
  if (supabaseUrl.includes('your-project-ref') || supabaseAnonKey.includes('your-anon-or-publishable-key')) return 'Replace the Supabase placeholder values in .env.';
  try {
    const parsed = new URL(supabaseUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) return 'The Supabase URL must use http or https.';
  } catch {
    return 'The Supabase project URL is invalid.';
  }
  if (supabaseAnonKey.length < 20) return 'The Supabase publishable/anon key is invalid.';
  return null;
}

let client: SupabaseClient | null = null;
let clientProblem = configurationProblem();

if (!clientProblem && supabaseUrl && supabaseAnonKey) {
  try {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        // Deep links are exchanged exactly once by authService.handleAuthRedirect.
        detectSessionInUrl: false,
      },
    });
  } catch (error) {
    clientProblem = error instanceof Error ? error.message : 'The Supabase client could not be initialized.';
  }
}

export const supabase = client;
export const isSupabaseConfigured = supabase !== null;
export const supabaseConfigurationError = clientProblem;
export const isDemoModeAvailable = __DEV__ && !supabaseUrl && !supabaseAnonKey;

if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', state => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

export function requireSupabase(): SupabaseClient {
  if (!supabase) throw new Error(supabaseConfigurationError ? `SUPABASE_CONFIGURATION_INVALID: ${supabaseConfigurationError}` : 'SUPABASE_NOT_CONFIGURED');
  return supabase;
}
