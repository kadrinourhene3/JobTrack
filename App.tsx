import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AddApplicationModal } from './src/components/AddApplicationModal';
import { ProductivityModal } from './src/components/ProductivityModal';
import { Toast, type ToastType } from './src/components';
import { ThemeContext } from './src/context';
import { useDashboardData } from './src/hooks/useDashboardData';
import { useApplicationContext } from './src/hooks/useApplicationContext';
import { AICareerScreen } from './src/screens/AICareerScreen';
import { AnalyticsScreen } from './src/screens/AnalyticsScreen';
import { ApplicationDetailScreen } from './src/screens/ApplicationDetailScreen';
import { ApplicationsScreen } from './src/screens/ApplicationsScreen';
import { AuthFlow } from './src/screens/auth/AuthFlow';
import { HomeScreen } from './src/screens/HomeScreen';
import { OnboardingScreen } from './src/screens/onboarding/OnboardingScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { useApplicationStore } from './src/stores/applicationStore';
import { useAuthStore } from './src/stores/authStore';
import { useSettingsStore } from './src/stores/settingsStore';
import { darkTheme, lightTheme, spacing, type Theme } from './src/theme';
import type { ApplicationStatus } from './src/types/domain';
import { pickAndUploadDocument } from './src/services/documentService';
import { handleAuthRedirect, isPasswordRecoveryRedirect } from './src/services/authService';
import { isSupabaseConfigured } from './src/lib/supabase';
import { cancelInterview, completeInterview, createInterview, deleteInterview, updateInterview } from './src/services/interviewService';
import { scheduleReminder } from './src/services/notificationService';

type Tab = 'home' | 'applications' | 'ai' | 'analytics' | 'profile';
type Route = { screen: 'tabs' } | { screen: 'detail'; id: string };

const tabs: { key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap; active: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'home', label: 'Home', icon: 'home-outline', active: 'home' },
  { key: 'applications', label: 'Applications', icon: 'briefcase-outline', active: 'briefcase' },
  { key: 'ai', label: 'AI Career', icon: 'sparkles-outline', active: 'sparkles' },
  { key: 'analytics', label: 'Analytics', icon: 'stats-chart-outline', active: 'stats-chart' },
  { key: 'profile', label: 'Profile', icon: 'person-outline', active: 'person' },
];

export default function App() {
  return <SafeAreaProvider><AppShell /></SafeAreaProvider>;
}

function AppShell() {
  const systemDark = useColorScheme() === 'dark';
  const { dark, hydrated, hydrate, setDark } = useSettingsStore();
  const authStatus = useAuthStore(state => state.status);
  const profile = useAuthStore(state => state.profile);
  const initializeAuth = useAuthStore(state => state.initialize);
  const signOut = useAuthStore(state => state.signOut);
  const setPasswordRecovery = useAuthStore(state => state.setPasswordRecovery);
  const reportAuthError = useAuthStore(state => state.reportError);
  const { items, loading, error, load, create, update, updateStatus, toggleFavorite, archive, remove, duplicate, clear } = useApplicationStore();
  const dashboard = useDashboardData(authStatus === 'authenticated' || authStatus === 'demo', authStatus === 'demo');
  const [tab, setTab] = useState<Tab>('home');
  const [route, setRoute] = useState<Route>({ screen: 'tabs' });
  const [addOpen, setAddOpen] = useState(false);
  const [productivityOpen, setProductivityOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState<ToastType>('success');
  const [toastVisible, setToastVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const theme = dark ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();

  useEffect(() => { hydrate(systemDark); }, []);
  useEffect(() => initializeAuth(), []);
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const open = async (url: string) => {
      try {
        // Enter recovery state before exchanging the link so SIGNED_IN cannot route past the reset form.
        if (isPasswordRecoveryRedirect(url)) setPasswordRecovery();
        const recovery = await handleAuthRedirect(url);
        if (recovery) setPasswordRecovery();
      } catch (error) {
        reportAuthError(error, 'This authentication link is invalid or expired. Request a new link and try again.');
      }
    };
    Linking.getInitialURL().then(url => { if (url) open(url); });
    const subscription = Linking.addEventListener('url', event => open(event.url));
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (authStatus === 'authenticated' || authStatus === 'demo') load(authStatus === 'demo');
    else if (authStatus === 'signedOut') { clear(); setRoute({ screen: 'tabs' }); setTab('home'); }
  }, [authStatus]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const showToast = useCallback((message: string, type: ToastType = inferToastType(message)) => {
    if (timer.current) clearTimeout(timer.current);
    setToast(message); setToastType(type); setToastVisible(true);
    timer.current = setTimeout(() => {
      setToastVisible(false);
      timer.current = null;
    }, type === 'error' ? 3000 : 2500);
  }, []);
  useEffect(() => { if (dashboard.error) showToast(dashboard.error, 'error'); }, [dashboard.error, showToast]);
  const goTab = (next: Tab) => { setTab(next); setRoute({ screen: 'tabs' }); };
  const changeStatus = async (id: string, status: ApplicationStatus) => showToast(await updateStatus(id, status) ? 'Application status updated' : 'Status update failed and was rolled back');
  const currentApplication = route.screen === 'detail' ? items.find(item => item.id === route.id) : undefined;
  const applicationContext = useApplicationContext(route.screen === 'detail' ? route.id : null, authStatus === 'authenticated');
  const isMain = authStatus === 'authenticated' || authStatus === 'demo';

  if (!hydrated || authStatus === 'loading') {
    return <ThemeContext.Provider value={theme}><StatusBar style={dark ? 'light' : 'dark'} /><View style={[styles.splash, { backgroundColor: theme.background }]}><View style={[styles.splashMark, { backgroundColor: theme.primary }]}><Ionicons name="briefcase" size={28} color="#fff" /></View><Text style={[styles.splashName, { color: theme.textPrimary }]}>JobTrack</Text></View></ThemeContext.Provider>;
  }

  return <ThemeContext.Provider value={theme}><StatusBar style={dark ? 'light' : 'dark'} /><View style={[styles.root, { backgroundColor: theme.background, paddingTop: insets.top }]}>
    {!isMain ? authStatus === 'onboarding' ? <OnboardingScreen /> : <AuthFlow /> : currentApplication ? (
      <ApplicationDetailScreen item={currentApplication} context={applicationContext.data} onBack={() => setRoute({ screen: 'tabs' })} onToast={showToast} onUpdate={values => update(currentApplication.id, values)} onCreateInterview={async values => { if (authStatus === 'demo') { showToast('Interview scheduling is available with Supabase connected'); return false; } try { await createInterview(values); await applicationContext.refresh(); dashboard.refresh(); showToast('Interview scheduled'); return true; } catch { showToast('Interview could not be scheduled'); return false; } }} onUpdateInterview={async (id, values) => { try { await updateInterview(id, values); await applicationContext.refresh(); showToast('Interview updated'); return true; } catch { showToast('Interview could not be updated'); return false; } }} onCompleteInterview={async id => { try { await completeInterview(id); await applicationContext.refresh(); showToast('Interview marked completed'); } catch { showToast('Interview could not be updated'); } }} onCancelInterview={async id => { try { await cancelInterview(id); await applicationContext.refresh(); showToast('Interview cancelled'); } catch { showToast('Interview could not be cancelled'); } }} onDeleteInterview={async id => { try { await deleteInterview(id); await applicationContext.refresh(); showToast('Interview deleted'); } catch { showToast('Interview could not be deleted'); } }} onRemindInterview={async interview => { try { const dayBefore = new Date(new Date(interview.scheduled_at).getTime() - 86_400_000); const at = dayBefore.getTime() > Date.now() ? dayBefore : new Date(Date.now() + 60_000); await scheduleReminder(`Interview with ${currentApplication.company}`, `${interview.interview_type} is coming up.`, at, { applicationId: currentApplication.id, interviewId: interview.id }); showToast('Interview reminder scheduled'); } catch { showToast('Enable notifications to schedule reminders'); } }} onAddDocument={async () => { if (authStatus === 'demo') return showToast('Document upload is available with Supabase connected'); try { const document = await pickAndUploadDocument('APPLICATION', currentApplication.id); if (document) { await applicationContext.refresh(); showToast('Document uploaded'); } } catch { showToast('Document upload failed'); } }} onFavorite={async () => { await toggleFavorite(currentApplication.id); showToast(currentApplication.favorite ? 'Removed from favorites' : 'Added to favorites'); }} onDuplicate={async () => { if (await duplicate(currentApplication.id)) showToast('Application duplicated'); }} onArchive={async () => { if (await archive(currentApplication.id)) { setRoute({ screen: 'tabs' }); showToast('Application archived'); } }} onDelete={async () => { if (await remove(currentApplication.id)) { setRoute({ screen: 'tabs' }); showToast('Application deleted'); } }} />
    ) : <>
      <View style={styles.screen}>
        {tab === 'home' && <HomeScreen applications={items} dashboard={dashboard.data} demo={authStatus === 'demo'} firstName={profile?.first_name || (authStatus === 'demo' ? 'Manel' : 'there')} onApplications={() => goTab('applications')} onApplication={id => setRoute({ screen: 'detail', id })} onAdd={() => setAddOpen(true)} onProductivity={() => setProductivityOpen(true)} onNotifications={() => showToast('Manage reminders from interviews and tasks')} />}
        {tab === 'applications' && <ApplicationsScreen applications={items} loading={loading} error={error} onApplication={id => setRoute({ screen: 'detail', id })} onAdd={() => setAddOpen(true)} onRetry={() => load(authStatus === 'demo', true)} onStatusChange={changeStatus} />}
        {tab === 'ai' && <AICareerScreen applications={items} onToast={showToast} />}
        {tab === 'analytics' && <AnalyticsScreen applications={items} />}
        {tab === 'profile' && <ProfileScreen profile={profile} dark={dark} onDark={setDark} onToast={showToast} onSignOut={signOut} />}
      </View>
      <BottomNav tab={tab} onTab={goTab} theme={theme} bottom={insets.bottom} />
    </>}
    {isMain && <AddApplicationModal visible={addOpen} onClose={() => setAddOpen(false)} onSave={async values => { const saved = await create(values); if (saved) { showToast('Application created successfully'); goTab('applications'); } else showToast('Application could not be created'); return saved; }} />}
    {isMain && <ProductivityModal visible={productivityOpen} demo={authStatus === 'demo'} onClose={() => setProductivityOpen(false)} onChanged={dashboard.refresh} onToast={showToast} />}
    <Toast message={toast} type={toastType} visible={toastVisible} bottom={Math.max(102, 84 + insets.bottom)} />
  </View></ThemeContext.Provider>;
}

function inferToastType(message: string): ToastType {
  return /could not|failed|unable|unavailable|invalid|expired|not granted|enable notifications|\bbefore\b|with supabase connected/i.test(message) ? 'error' : 'success';
}

function BottomNav({ tab, onTab, theme, bottom }: { tab: Tab; onTab: (tab: Tab) => void; theme: Theme; bottom: number }) {
  return <View style={[styles.nav, { height: 68 + bottom, paddingBottom: bottom, backgroundColor: theme.surface, borderTopColor: theme.border }]}>{tabs.map(item => <NavItem key={item.key} item={item} active={tab === item.key} onPress={() => onTab(item.key)} theme={theme} />)}</View>;
}

function NavItem({ item, active, onPress, theme }: { item: typeof tabs[number]; active: boolean; onPress: () => void; theme: Theme }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => { if (active) Animated.sequence([Animated.spring(scale, { toValue: 1.12, useNativeDriver: true, speed: 35 }), Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 25 })]).start(); }, [active]);
  return <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={onPress} style={styles.navItem}><Animated.View style={{ transform: [{ scale }] }}><Ionicons name={active ? item.active : item.icon} size={21} color={active ? theme.primary : theme.textSecondary} /></Animated.View><Text numberOfLines={1} style={[styles.navLabel, { color: active ? theme.primary : theme.textSecondary, fontWeight: active ? '600' : '500' }]}>{item.label}</Text>{active && <View style={[styles.activeDot, { backgroundColor: theme.primary }]} />}</Pressable>;
}

const styles = StyleSheet.create({
  root: { flex: 1 }, screen: { flex: 1 }, splash: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm }, splashMark: { width: 58, height: 58, borderRadius: 19, alignItems: 'center', justifyContent: 'center' }, splashName: { fontSize: 24, fontWeight: '700', letterSpacing: -0.6 },
  nav: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopWidth: 1, flexDirection: 'row', paddingHorizontal: spacing.xs, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: -5 }, elevation: 10 },
  navItem: { flex: 1, height: 68, alignItems: 'center', justifyContent: 'center', gap: 4 }, navLabel: { fontSize: 10.5, lineHeight: 14 }, activeDot: { position: 'absolute', bottom: 5, width: 4, height: 4, borderRadius: 2 },
});
