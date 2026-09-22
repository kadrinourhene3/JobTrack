import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context';
import { IconButton, SectionHeader, type ToastType } from '../components';
import { radius, spacing, typography } from '../theme';
import type { Profile } from '../types/domain';
import { EditProfileModal } from '../components/EditProfileModal';
import { ProfilePanelModal, type ProfilePanel } from '../components/ProfilePanels';
import { useAuthStore } from '../stores/authStore';
import { getAvatarUrl } from '../services/profileService';
import { calculateProfileCompletion } from '../utils/profileCompletion';

type Toast = (message: string, type?: ToastType) => void;

const demoProfile: Profile = {
  id: 'demo-profile',
  email: 'demo@jobtrack.local',
  first_name: 'Manel',
  last_name: 'Benali',
  avatar_path: null,
  phone: null,
  country: 'Algeria',
  city: 'Algiers',
  current_job_title: 'Product Designer',
  years_of_experience: null,
  career_goal: null,
  skills: ['Figma', 'Research', 'React'],
  linkedin_url: null,
  github_url: null,
  portfolio_url: null,
  onboarding_completed: true,
  created_at: '',
  updated_at: '',
};

export function ProfileScreen({ profile, dark, onDark, onToast, onSignOut }: { profile: Profile | null; dark: boolean; onDark: (value: boolean) => void; onToast: Toast; onSignOut: () => void }) {
  const theme = useTheme();
  const [editing, setEditing] = useState(false);
  const [panel, setPanel] = useState<ProfilePanel | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const saveProfile = useAuthStore(state => state.saveProfile);
  const saveProfileFields = useAuthStore(state => state.saveProfileFields);
  const uploadAvatar = useAuthStore(state => state.uploadAvatar);
  const demo = useAuthStore(state => state.status === 'demo');
  const displayProfile = profile || (demo ? demoProfile : null);
  const firstName = displayProfile?.first_name || '';
  const lastName = displayProfile?.last_name || '';
  const initials = `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();
  const displayName = [firstName, lastName].filter(Boolean).join(' ') || displayProfile?.email || 'JobTrack user';
  const role = displayProfile?.current_job_title || 'Role not set';
  const place = [displayProfile?.city, displayProfile?.country].filter(Boolean).join(', ') || 'Location not set';
  const skills = displayProfile?.skills?.length ? displayProfile.skills.join(' · ') : 'No skills added';
  const completion = useMemo(() => calculateProfileCompletion(displayProfile), [displayProfile]);

  useEffect(() => {
    let active = true;
    if (!displayProfile?.avatar_path) { setAvatarUrl(null); return () => { active = false; }; }
    getAvatarUrl(displayProfile.avatar_path).then(url => { if (active) setAvatarUrl(url); }).catch(() => { if (active) setAvatarUrl(null); });
    return () => { active = false; };
  }, [displayProfile?.avatar_path]);

  const chooseAvatar = async () => {
    setPanel(null);
    const result = await uploadAvatar();
    if (result === 'updated') onToast('Avatar updated');
    else if (result === 'failed') onToast('Avatar could not be updated', 'error');
    else if (result === 'unavailable') onToast('Sign in to update your profile photo', 'error');
  };

  const openEditor = () => { setPanel(null); setEditing(true); };

  return (
    <>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}><Text style={[typography.screenTitle, { color: theme.textPrimary }]}>Profile</Text><IconButton name="settings-outline" label="Settings" onPress={() => setPanel('settings')} /></View>
        <View style={styles.identity}><Pressable accessibilityLabel="Change profile photo" onPress={() => void chooseAvatar()} style={[styles.avatar, { backgroundColor: theme.primaryMuted }]}>{avatarUrl ? <Image source={{ uri: avatarUrl }} style={styles.avatarImage} /> : <Text style={[styles.avatarText, { color: theme.primary }]}>{initials || 'JT'}</Text>}<View style={[styles.online, { backgroundColor: theme.success, borderColor: theme.background }]} /><View style={[styles.camera, { backgroundColor: theme.surface, borderColor: theme.border }]}><Ionicons name="camera-outline" size={14} color={theme.primary} /></View></Pressable><Text style={[typography.sectionTitle, { color: theme.textPrimary, marginTop: spacing.sm }]}>{displayName}</Text><Text style={[typography.body, { color: theme.textSecondary }]}>{role} · {place}</Text><Pressable onPress={openEditor} style={[styles.edit, { borderColor: theme.border, backgroundColor: theme.surface }]}><Text style={[typography.bodyMedium, { color: theme.textPrimary }]}>Edit profile</Text></Pressable></View>
        <Pressable accessibilityLabel={`Profile completion ${completion.percentage} percent`} onPress={() => setPanel('completion')} style={({ pressed }) => [styles.completion, { backgroundColor: theme.primaryMuted, opacity: pressed ? 0.72 : 1 }]}><View style={[styles.completionRing, { borderColor: theme.primary }]}><Text style={[typography.bodyMedium, { color: theme.primary }]}>{completion.percentage}%</Text></View><View style={{ flex: 1 }}><Text style={[typography.cardTitle, { color: theme.textPrimary }]}>{completion.percentage === 100 ? 'Your profile is complete' : 'Keep building your profile'}</Text><Text style={[typography.caption, { color: theme.textSecondary, marginTop: 2 }]}>{completion.recommendation}</Text></View><Ionicons name="chevron-forward" size={19} color={theme.primary} /></Pressable>
        <View><SectionHeader title="Career preferences" /><SettingRow icon="briefcase-outline" title={role} subtitle="Target role" onPress={() => setPanel('role')} /><SettingRow icon="location-outline" title={place} subtitle="Location" onPress={() => setPanel('location')} /><SettingRow icon="layers-outline" title={skills} subtitle="Skills" onPress={() => setPanel('skills')} /></View>
        <View><SectionHeader title="Preferences" /><View style={[styles.settingGroup, { borderColor: theme.border, backgroundColor: theme.surface }]}><View style={styles.toggleRow}><View style={[styles.settingIcon, { backgroundColor: theme.surfaceSecondary }]}><Ionicons name="moon-outline" size={20} color={theme.textPrimary} /></View><View style={{ flex: 1 }}><Text style={[typography.bodyMedium, { color: theme.textPrimary }]}>Dark appearance</Text><Text style={[typography.caption, { color: theme.textSecondary }]}>Use a low-light color theme</Text></View><Switch value={dark} onValueChange={onDark} trackColor={{ false: theme.border, true: theme.primary }} thumbColor="#fff" /></View><View style={[styles.divider, { backgroundColor: theme.border }]} /><Pressable onPress={() => setPanel('notifications')} style={({ pressed }) => [styles.toggleRow, { opacity: pressed ? 0.65 : 1 }]}><View style={[styles.settingIcon, { backgroundColor: theme.surfaceSecondary }]}><Ionicons name="notifications-outline" size={20} color={theme.textPrimary} /></View><View style={{ flex: 1 }}><Text style={[typography.bodyMedium, { color: theme.textPrimary }]}>Notifications</Text><Text style={[typography.caption, { color: theme.textSecondary }]}>Permission and interview reminders</Text></View><Ionicons name="chevron-forward" size={18} color={theme.textSecondary} /></Pressable></View></View>
        <View><SectionHeader title="JobTrack" /><SettingRow icon="document-text-outline" title="Documents" subtitle={demo ? 'Sign in to manage files' : 'Private Supabase storage'} onPress={() => setPanel('documents')} /><SettingRow icon="shield-checkmark-outline" title="Privacy & security" onPress={() => setPanel('privacy')} /><SettingRow icon="help-circle-outline" title="Help & support" onPress={() => setPanel('help')} /><SettingRow icon="information-circle-outline" title="About JobTrack" subtitle="Version 1.0.0" onPress={() => setPanel('about')} /></View>
        <Pressable accessibilityRole="button" onPress={onSignOut}><Text style={[typography.bodyMedium, { color: theme.danger, textAlign: 'center', paddingVertical: spacing.md }]}>Sign out</Text></Pressable>
      </ScrollView>
      <EditProfileModal visible={editing} profile={displayProfile} onClose={() => setEditing(false)} onSave={async values => { const saved = await saveProfile(values); onToast(saved ? 'Profile updated' : 'Profile could not be updated', saved ? 'success' : 'error'); return saved; }} />
      <ProfilePanelModal panel={panel} profile={displayProfile} demo={demo} dark={dark} onDark={onDark} onClose={() => setPanel(null)} onNavigate={setPanel} onEditProfile={openEditor} onAvatar={() => void chooseAvatar()} onSaveFields={saveProfileFields} onToast={onToast} />
    </>
  );
}

function SettingRow({ icon, title, subtitle, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle?: string; onPress: () => void }) { const theme = useTheme(); return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.settingRow, { borderBottomColor: theme.border, opacity: pressed ? 0.6 : 1 }]}><View style={[styles.settingIcon, { backgroundColor: theme.surfaceSecondary }]}><Ionicons name={icon} size={20} color={theme.textPrimary} /></View><View style={{ flex: 1 }}><Text numberOfLines={1} style={[typography.bodyMedium, { color: theme.textPrimary }]}>{title}</Text>{subtitle ? <Text style={[typography.caption, { color: theme.textSecondary }]}>{subtitle}</Text> : null}</View><Ionicons name="chevron-forward" size={18} color={theme.textSecondary} /></Pressable>; }

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 120, gap: spacing.xxl }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  identity: { alignItems: 'center' }, avatar: { width: 82, height: 82, borderRadius: 27, alignItems: 'center', justifyContent: 'center' }, avatarImage: { width: 82, height: 82, borderRadius: 27 }, avatarText: { fontSize: 27, fontWeight: '700' }, online: { width: 16, height: 16, borderRadius: 8, borderWidth: 3, position: 'absolute', right: -2, bottom: 3 }, edit: { marginTop: spacing.md, height: 38, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: spacing.md, alignItems: 'center', justifyContent: 'center' },
  camera: { position: 'absolute', right: -8, top: -6, width: 29, height: 29, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  completion: { borderRadius: radius.lg, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, completionRing: { width: 48, height: 48, borderRadius: 24, borderWidth: 5, alignItems: 'center', justifyContent: 'center' },
  settingRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderBottomWidth: 1 }, settingIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  settingGroup: { borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: spacing.md }, toggleRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, divider: { height: 1, marginLeft: 52 },
});
