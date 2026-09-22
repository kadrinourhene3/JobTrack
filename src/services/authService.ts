import * as Linking from 'expo-linking';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { requireSupabase } from '../lib/supabase';
import type { Profile } from '../types/domain';
import type { SignInValues, SignUpValues } from '../schemas/authSchemas';

export async function signIn(values: SignInValues): Promise<Session> {
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithPassword(values);
  if (error) throw error;
  if (!data.session) throw new Error('No session was created.');
  return data.session;
}

export async function signUp(values: SignUpValues): Promise<{ session: Session | null; emailConfirmationRequired: boolean }> {
  const client = requireSupabase();
  const { data, error } = await client.auth.signUp({
    email: values.email,
    password: values.password,
    options: {
      emailRedirectTo: Linking.createURL('auth/verified'),
      data: { first_name: values.firstName, last_name: values.lastName },
    },
  });
  if (error) throw error;
  return { session: data.session, emailConfirmationRequired: !data.session };
}

export async function sendPasswordReset(email: string): Promise<void> {
  const { error } = await requireSupabase().auth.resetPasswordForEmail(email, {
    redirectTo: Linking.createURL('auth/reset-password'),
  });
  if (error) throw error;
}

export async function updatePassword(password: string): Promise<void> {
  const { error } = await requireSupabase().auth.updateUser({ password });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const { error } = await requireSupabase().auth.signOut();
  if (error) throw error;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await requireSupabase().from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function ensureProfile(session: Session): Promise<Profile> {
  const existing = await getProfile(session.user.id);
  if (existing) return existing;

  const metadata = session.user.user_metadata || {};
  const { data, error } = await requireSupabase().from('profiles').insert({
    id: session.user.id,
    email: session.user.email || '',
    first_name: typeof metadata.first_name === 'string' ? metadata.first_name : null,
    last_name: typeof metadata.last_name === 'string' ? metadata.last_name : null,
  }).select('*').single();

  // A simultaneous auth trigger or client restoration can win this insert race.
  if (error && error.code !== '23505') throw error;
  if (data) return data as Profile;
  const recovered = await getProfile(session.user.id);
  if (!recovered) throw new Error('Your profile could not be initialized.');
  return recovered;
}

export async function updateProfile(userId: string, updates: Partial<Omit<Profile, 'id' | 'email' | 'created_at' | 'updated_at'>>): Promise<Profile> {
  const { data, error } = await requireSupabase().from('profiles').update(updates).eq('id', userId).select('*').single();
  if (error) throw error;
  return data as Profile;
}

export function subscribeToAuth(callback: (event: AuthChangeEvent, session: Session | null) => void): () => void {
  const { data } = requireSupabase().auth.onAuthStateChange(callback);
  return () => data.subscription.unsubscribe();
}

function parseAuthUrl(url: string): URL {
  const normalized = url.includes('#') ? url.replace('#', url.includes('?') ? '&' : '?') : url;
  return new URL(normalized);
}

export function isPasswordRecoveryRedirect(url: string): boolean {
  const parsed = parseAuthUrl(url);
  return parsed.searchParams.get('type') === 'recovery' || parsed.pathname.includes('reset-password');
}

export async function handleAuthRedirect(url: string): Promise<boolean> {
  const parsed = parseAuthUrl(url);
  const redirectError = parsed.searchParams.get('error_description') || parsed.searchParams.get('error');
  if (redirectError) throw new Error(redirectError.replace(/\+/g, ' '));
  const code = parsed.searchParams.get('code');
  const accessToken = parsed.searchParams.get('access_token');
  const refreshToken = parsed.searchParams.get('refresh_token');
  if (code) {
    const { error } = await requireSupabase().auth.exchangeCodeForSession(code);
    if (error) throw error;
  } else if (accessToken && refreshToken) {
    const { error } = await requireSupabase().auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    if (error) throw error;
  }
  return isPasswordRecoveryRedirect(url);
}
