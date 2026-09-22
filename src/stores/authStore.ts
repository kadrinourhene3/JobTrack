import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { friendlyError } from '../lib/errors';
import { isDemoModeAvailable, isSupabaseConfigured, requireSupabase, supabaseConfigurationError } from '../lib/supabase';
import * as authService from '../services/authService';
import type { Profile } from '../types/domain';
import type { SignInValues, SignUpValues } from '../schemas/authSchemas';
import type { ProfileFormValues } from '../schemas/profileSchema';
import { pickAndUploadAvatar } from '../services/profileService';
import { normalizeSkills } from '../utils/profileCompletion';

type ProfileUpdates = Partial<Omit<Profile, 'id' | 'email' | 'created_at' | 'updated_at'>>;
type AvatarUpdateResult = 'updated' | 'cancelled' | 'failed' | 'unavailable';

type AuthStatus = 'loading' | 'signedOut' | 'verification' | 'onboarding' | 'authenticated' | 'demo' | 'passwordRecovery';

type AuthState = {
  status: AuthStatus;
  session: Session | null;
  profile: Profile | null;
  error: string | null;
  busy: boolean;
  initialize: () => () => void;
  signIn: (values: SignInValues) => Promise<boolean>;
  signUp: (values: SignUpValues) => Promise<boolean>;
  signOut: () => Promise<void>;
  enterDemo: () => void;
  clearError: () => void;
  completeOnboarding: (updates: Partial<Profile>) => Promise<boolean>;
  setPasswordRecovery: () => void;
  resetPassword: (password: string) => Promise<boolean>;
  reportError: (error: unknown, fallback?: string) => void;
  saveProfile: (values: ProfileFormValues) => Promise<boolean>;
  saveProfileFields: (updates: ProfileUpdates) => Promise<boolean>;
  uploadAvatar: () => Promise<AvatarUpdateResult>;
};

async function resolveAuthenticatedState(session: Session): Promise<Pick<AuthState, 'session' | 'profile' | 'status'>> {
  const profile = await authService.ensureProfile(session);
  return { session, profile, status: profile.onboarding_completed ? 'authenticated' : 'onboarding' };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'loading', session: null, profile: null, error: null, busy: false,
  initialize: () => {
    if (!isSupabaseConfigured) {
      set({ status: 'signedOut', error: supabaseConfigurationError ? friendlyError(new Error(`SUPABASE_CONFIGURATION_INVALID: ${supabaseConfigurationError}`)) : null });
      return () => undefined;
    }
    let disposed = false;
    let authEventReceived = false;
    let revision = 0;

    const applySession = async (event: string, session: Session | null) => {
      const currentRevision = ++revision;
      if (event === 'PASSWORD_RECOVERY') {
        if (!disposed) set({ status: 'passwordRecovery', session, error: null });
        return;
      }
      if (!session) {
        if (!disposed) set({ status: 'signedOut', session: null, profile: null });
        return;
      }
      if (get().status === 'passwordRecovery') {
        if (!disposed) set({ session });
        return;
      }
      try {
        const next = await resolveAuthenticatedState(session);
        if (!disposed && currentRevision === revision && get().status !== 'passwordRecovery') set({ ...next, error: null });
      } catch (error) {
        if (!disposed && currentRevision === revision) set({ status: 'signedOut', session: null, profile: null, error: friendlyError(error, 'We could not load your profile. Check your connection and try again.') });
      }
    };

    const queueSession = (event: string, session: Session | null) => {
      setTimeout(() => { void applySession(event, session); }, 0);
    };

    const unsubscribe = authService.subscribeToAuth((event, session) => {
      authEventReceived = true;
      queueSession(event, session);
    });

    requireSupabase().auth.getSession().then(({ data, error }) => {
      if (error) throw error;
      if (!authEventReceived) queueSession('INITIAL_SESSION', data.session);
    }).catch(error => {
      if (!disposed && !authEventReceived) set({ status: 'signedOut', session: null, profile: null, error: friendlyError(error, 'We could not restore your session.') });
    });

    return () => { disposed = true; revision += 1; unsubscribe(); };
  },
  signIn: async values => {
    set({ busy: true, error: null });
    try { const session = await authService.signIn(values); set({ ...(await resolveAuthenticatedState(session)), busy: false }); return true; }
    catch (error) { set({ busy: false, error: friendlyError(error, 'Unable to sign in right now.') }); return false; }
  },
  signUp: async values => {
    set({ busy: true, error: null });
    try {
      const result = await authService.signUp(values);
      if (!result.session) set({ status: 'verification', busy: false });
      else set({ ...(await resolveAuthenticatedState(result.session)), busy: false });
      return true;
    } catch (error) { set({ busy: false, error: friendlyError(error, 'Unable to create your account.') }); return false; }
  },
  signOut: async () => {
    if (get().status === 'demo') return set({ status: 'signedOut', session: null, profile: null });
    set({ busy: true });
    try { await authService.signOut(); set({ status: 'signedOut', session: null, profile: null, busy: false }); }
    catch (error) { set({ busy: false, error: friendlyError(error, 'Unable to sign out.') }); }
  },
  enterDemo: () => isDemoModeAvailable
    ? set({ status: 'demo', error: null, profile: null, session: null })
    : set({ error: 'Demo mode is only available in development when Supabase is not connected.' }),
  clearError: () => set({ error: null }),
  completeOnboarding: async updates => {
    const session = get().session;
    if (!session) return false;
    set({ busy: true, error: null });
    try { const profile = await authService.updateProfile(session.user.id, { ...updates, onboarding_completed: true }); set({ profile, status: 'authenticated', busy: false }); return true; }
    catch (error) { set({ busy: false, error: friendlyError(error, 'Unable to save your profile.') }); return false; }
  },
  setPasswordRecovery: () => set({ status: 'passwordRecovery', error: null }),
  resetPassword: async password => {
    if (!get().session) { set({ error: 'This password reset link is invalid or expired.' }); return false; }
    set({ busy: true, error: null });
    try {
      await authService.updatePassword(password);
      const next = await resolveAuthenticatedState(get().session!);
      set({ ...next, busy: false, error: null });
      return true;
    } catch (error) {
      set({ busy: false, error: friendlyError(error, 'Unable to update your password. Request a new reset link and try again.') });
      return false;
    }
  },
  reportError: (error, fallback) => set(state => ({
    error: friendlyError(error, fallback),
    ...(state.status === 'verification' ? { status: 'signedOut' as const } : {}),
  })),
  saveProfile: async values => {
    return get().saveProfileFields({ first_name: values.firstName, last_name: values.lastName, phone: values.phone || null, country: values.country || null, city: values.city || null, current_job_title: values.currentJobTitle || null, years_of_experience: values.yearsOfExperience ? Number(values.yearsOfExperience) : null, career_goal: values.careerGoal || null, skills: normalizeSkills(values.skills.split(',')), linkedin_url: values.linkedinUrl || null, github_url: values.githubUrl || null, portfolio_url: values.portfolioUrl || null });
  },
  saveProfileFields: async updates => {
    const session = get().session; if (!session) return false;
    set({ busy: true, error: null });
    try {
      const profile = await authService.updateProfile(session.user.id, { ...updates, ...(updates.skills ? { skills: normalizeSkills(updates.skills) } : {}) });
      set({ profile, busy: false }); return true;
    } catch (error) { set({ busy: false, error: friendlyError(error, 'Unable to save your profile.') }); return false; }
  },
  uploadAvatar: async () => {
    if (get().status === 'demo') return 'unavailable';
    set({ busy: true, error: null });
    try { const profile = await pickAndUploadAvatar(); if (profile) set({ profile }); set({ busy: false }); return profile ? 'updated' : 'cancelled'; }
    catch (error) { set({ busy: false, error: friendlyError(error, 'Unable to update your avatar.') }); return 'failed'; }
  },
}));
