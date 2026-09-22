import React, { ReactNode, useEffect, useState } from 'react';
import { Alert, AppState, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Field, PrimaryButton, type ToastType } from '../components';
import { useTheme } from '../context';
import { friendlyError } from '../lib/errors';
import { sendPasswordReset } from '../services/authService';
import { deleteDocument, getAllDocuments, getTemporaryDocumentUrl, pickAndUploadDocument, type StoredDocument } from '../services/documentService';
import { getNotificationPermissionState, requestNotificationPermission, type NotificationPermissionState } from '../services/notificationService';
import { radius, spacing, typography } from '../theme';
import type { Profile } from '../types/domain';
import { calculateProfileCompletion, normalizeSkills, type ProfileCompletionAction } from '../utils/profileCompletion';

export type ProfilePanel = 'settings' | 'role' | 'location' | 'skills' | 'completion' | 'notifications' | 'documents' | 'privacy' | 'help' | 'about';
type ProfileUpdates = Partial<Omit<Profile, 'id' | 'email' | 'created_at' | 'updated_at'>>;
type Toast = (message: string, type?: ToastType) => void;

const panelTitles: Record<ProfilePanel, string> = {
  settings: 'Settings', role: 'Target role', location: 'Location', skills: 'Skills', completion: 'Profile completion', notifications: 'Notifications', documents: 'Documents', privacy: 'Privacy & security', help: 'Help & support', about: 'About JobTrack',
};

export function ProfilePanelModal({ panel, profile, demo, dark, onDark, onClose, onNavigate, onEditProfile, onAvatar, onSaveFields, onToast }: { panel: ProfilePanel | null; profile: Profile | null; demo: boolean; dark: boolean; onDark: (value: boolean) => void; onClose: () => void; onNavigate: (panel: ProfilePanel) => void; onEditProfile: () => void; onAvatar: () => void; onSaveFields: (updates: ProfileUpdates) => Promise<boolean>; onToast: Toast }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const closeButtonTopOffset = Platform.OS === 'ios'
    ? Math.min(31, Math.max(27, insets.top / 5 + 19))
    : 0;
  if (!panel) return null;
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.root, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}><Pressable accessibilityLabel="Close" onPress={onClose} style={[styles.iconButton, { backgroundColor: theme.surface, borderColor: theme.border, transform: [{ translateY: closeButtonTopOffset }] }]}><Ionicons name="close" size={21} color={theme.textPrimary} /></Pressable><Text style={[typography.cardTitle, { color: theme.textPrimary }]}>{panelTitles[panel]}</Text><View style={{ width: 44 }} /></View>
        {panel === 'settings' ? <SettingsPanel dark={dark} onDark={onDark} onNavigate={onNavigate} /> : null}
        {panel === 'role' ? <RolePanel profile={profile} onSave={onSaveFields} onClose={onClose} onToast={onToast} /> : null}
        {panel === 'location' ? <LocationPanel profile={profile} onSave={onSaveFields} onClose={onClose} onToast={onToast} /> : null}
        {panel === 'skills' ? <SkillsPanel profile={profile} onSave={onSaveFields} onClose={onClose} onToast={onToast} /> : null}
        {panel === 'completion' ? <CompletionPanel profile={profile} onAction={action => completionAction(action, onNavigate, onEditProfile, onAvatar)} /> : null}
        {panel === 'notifications' ? <NotificationsPanel onToast={onToast} /> : null}
        {panel === 'documents' ? <DocumentsPanel demo={demo} onToast={onToast} /> : null}
        {panel === 'privacy' ? <PrivacyPanel profile={profile} demo={demo} onToast={onToast} /> : null}
        {panel === 'help' ? <HelpPanel /> : null}
        {panel === 'about' ? <AboutPanel /> : null}
      </KeyboardAvoidingView>
    </Modal>
  );
}

function completionAction(action: ProfileCompletionAction, navigate: (panel: ProfilePanel) => void, edit: () => void, avatar: () => void) {
  if (action === 'edit') return edit();
  if (action === 'avatar') return avatar();
  navigate(action);
}

function PanelScroll({ children }: { children: ReactNode }) {
  return <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>{children}</ScrollView>;
}

function SettingsPanel({ dark, onDark, onNavigate }: { dark: boolean; onDark: (value: boolean) => void; onNavigate: (panel: ProfilePanel) => void }) {
  const theme = useTheme();
  return <PanelScroll><PanelIntro icon="settings-outline" title="App settings" copy="Manage preferences backed by your device and existing JobTrack services." /><View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.border }]}><View style={styles.switchRow}><View style={[styles.rowIcon, { backgroundColor: theme.surfaceSecondary }]}><Ionicons name="moon-outline" size={20} color={theme.textPrimary} /></View><View style={{ flex: 1 }}><Text style={[typography.bodyMedium, { color: theme.textPrimary }]}>Dark appearance</Text><Text style={[typography.caption, { color: theme.textSecondary }]}>Saved on this device</Text></View><Switch value={dark} onValueChange={onDark} trackColor={{ false: theme.border, true: theme.primary }} thumbColor="#fff" /></View><Divider /><PanelLink icon="notifications-outline" title="Notifications" onPress={() => onNavigate('notifications')} /><Divider /><PanelLink icon="shield-checkmark-outline" title="Privacy & security" onPress={() => onNavigate('privacy')} /><Divider /><PanelLink icon="information-circle-outline" title="About JobTrack" onPress={() => onNavigate('about')} /></View></PanelScroll>;
}

const roleSuggestions = ['Software Developer', 'Mobile Developer', 'Frontend Developer', 'Backend Developer', 'Full-Stack Developer', 'Data Scientist', 'Product Designer'];

function RolePanel({ profile, onSave, onClose, onToast }: { profile: Profile | null; onSave: (updates: ProfileUpdates) => Promise<boolean>; onClose: () => void; onToast: Toast }) {
  const theme = useTheme();
  const [value, setValue] = useState(profile?.current_job_title || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async () => { const role = value.trim(); if (!role) return setError('Enter a target role.'); setBusy(true); const saved = await onSave({ current_job_title: role }); setBusy(false); onToast(saved ? 'Target role updated' : 'Target role could not be updated', saved ? 'success' : 'error'); if (saved) onClose(); };
  return <PanelScroll><PanelIntro icon="briefcase-outline" title="Your target role" copy="This value is also used by Edit Profile and your authenticated AI Career context." /><Field label="Target role" value={value} onChangeText={text => { setValue(text); setError(''); }} placeholder="e.g. Mobile Developer" maxLength={160} error={error} autoCapitalize="words" /><View><Text style={[typography.label, { color: theme.textSecondary, marginBottom: spacing.sm }]}>COMMON ROLES</Text><View style={styles.chips}>{roleSuggestions.map(role => <Pressable key={role} onPress={() => { setValue(role); setError(''); }} style={[styles.chip, { backgroundColor: value.toLocaleLowerCase() === role.toLocaleLowerCase() ? theme.primaryMuted : theme.surface, borderColor: value.toLocaleLowerCase() === role.toLocaleLowerCase() ? theme.primary : theme.border }]}><Text style={[typography.bodyMedium, { color: value.toLocaleLowerCase() === role.toLocaleLowerCase() ? theme.primary : theme.textSecondary }]}>{role}</Text></Pressable>)}</View></View><PrimaryButton title={busy ? 'Saving…' : 'Save target role'} disabled={busy} onPress={save} /><CancelButton onPress={onClose} /></PanelScroll>;
}

function LocationPanel({ profile, onSave, onClose, onToast }: { profile: Profile | null; onSave: (updates: ProfileUpdates) => Promise<boolean>; onClose: () => void; onToast: Toast }) {
  const [city, setCity] = useState(profile?.city || '');
  const [country, setCountry] = useState(profile?.country || '');
  const [busy, setBusy] = useState(false);
  const save = async () => { setBusy(true); const saved = await onSave({ city: city.trim() || null, country: country.trim() || null }); setBusy(false); onToast(saved ? 'Location updated' : 'Location could not be updated', saved ? 'success' : 'error'); if (saved) onClose(); };
  return <PanelScroll><PanelIntro icon="location-outline" title="Job-search location" copy="Choose the location you use for career preferences. JobTrack does not request your device GPS." /><Field label="City or region" value={city} onChangeText={setCity} placeholder="e.g. Algiers" maxLength={100} autoCapitalize="words" /><Field label="Country" value={country} onChangeText={setCountry} placeholder="e.g. Algeria" maxLength={100} autoCapitalize="words" /><PrimaryButton title={busy ? 'Saving…' : 'Save location'} disabled={busy} onPress={save} /><CancelButton onPress={onClose} /></PanelScroll>;
}

function SkillsPanel({ profile, onSave, onClose, onToast }: { profile: Profile | null; onSave: (updates: ProfileUpdates) => Promise<boolean>; onClose: () => void; onToast: Toast }) {
  const theme = useTheme();
  const [skills, setSkills] = useState(() => normalizeSkills(profile?.skills || []));
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const add = () => { const candidate = draft.trim().replace(/\s+/g, ' '); if (!candidate) return setError('Enter a skill before adding it.'); if (skills.some(skill => skill.toLocaleLowerCase() === candidate.toLocaleLowerCase())) return setError('That skill is already listed.'); if (candidate.length > 80) return setError('Keep each skill under 80 characters.'); if (skills.length >= 30) return setError('You can save up to 30 skills.'); setSkills(current => [...current, candidate]); setDraft(''); setError(''); };
  const save = async () => { setBusy(true); const saved = await onSave({ skills: normalizeSkills(skills) }); setBusy(false); onToast(saved ? 'Skills updated' : 'Skills could not be updated', saved ? 'success' : 'error'); if (saved) onClose(); };
  return <PanelScroll><PanelIntro icon="layers-outline" title="Manage skills" copy="Add only skills that belong to your real profile. Capitalization and whitespace duplicates are removed." /><View style={styles.addRow}><TextInput value={draft} onChangeText={text => { setDraft(text); setError(''); }} onSubmitEditing={add} returnKeyType="done" placeholder="Add a skill" placeholderTextColor={theme.textSecondary} maxLength={80} style={[styles.skillInput, { color: theme.textPrimary, backgroundColor: theme.surface, borderColor: error ? theme.danger : theme.border }]} /><Pressable accessibilityLabel="Add skill" onPress={add} style={[styles.addButton, { backgroundColor: theme.primary }]}><Ionicons name="add" size={22} color="#fff" /></Pressable></View>{error ? <Text style={[typography.caption, { color: theme.danger }]}>{error}</Text> : null}<View style={styles.skillList}>{skills.length ? skills.map(skill => <View key={skill.toLocaleLowerCase()} style={[styles.skillTag, { backgroundColor: theme.primaryMuted }]}><Text style={[typography.bodyMedium, { color: theme.primary }]}>{skill}</Text><Pressable accessibilityLabel={`Remove ${skill}`} onPress={() => setSkills(current => current.filter(item => item !== skill))} hitSlop={8}><Ionicons name="close" size={16} color={theme.primary} /></Pressable></View>) : <Text style={[typography.body, { color: theme.textSecondary }]}>No skills added yet.</Text>}</View><PrimaryButton title={busy ? 'Saving…' : 'Save skills'} disabled={busy} onPress={save} /><CancelButton onPress={onClose} /></PanelScroll>;
}

function CompletionPanel({ profile, onAction }: { profile: Profile | null; onAction: (action: ProfileCompletionAction) => void }) {
  const theme = useTheme();
  const completion = calculateProfileCompletion(profile);
  return <PanelScroll><View style={styles.completionHero}><View style={[styles.largeRing, { borderColor: theme.primary }]}><Text style={[styles.percentage, { color: theme.primary }]}>{completion.percentage}%</Text></View><Text style={[typography.sectionTitle, { color: theme.textPrimary }]}>Profile completion</Text><Text style={[typography.body, { color: theme.textSecondary, textAlign: 'center' }]}>{completion.recommendation}</Text></View>{completion.completed.length ? <Checklist title="Completed" items={completion.completed} complete onAction={onAction} /> : null}{completion.missing.length ? <Checklist title="Still to complete" items={completion.missing} onAction={onAction} /> : null}</PanelScroll>;
}

function Checklist({ title, items, complete = false, onAction }: { title: string; items: ReturnType<typeof calculateProfileCompletion>['missing']; complete?: boolean; onAction: (action: ProfileCompletionAction) => void }) {
  const theme = useTheme();
  return <View><Text style={[typography.sectionTitle, { color: theme.textPrimary, marginBottom: spacing.sm }]}>{title}</Text><View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.border }]}>{items.map((item, index) => { const content = <><Ionicons name={complete ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={complete ? theme.success : theme.textSecondary} /><Text style={[typography.bodyMedium, { color: theme.textPrimary, flex: 1 }]}>{item.label}</Text>{!complete ? <Ionicons name="chevron-forward" size={17} color={theme.textSecondary} /> : null}</>; return <React.Fragment key={item.key}>{complete ? <View style={styles.checkRow}>{content}</View> : <Pressable onPress={() => onAction(item.action)} style={({ pressed }) => [styles.checkRow, { opacity: pressed ? 0.65 : 1 }]}>{content}</Pressable>}{index < items.length - 1 ? <Divider /> : null}</React.Fragment>; })}</View></View>;
}

function NotificationsPanel({ onToast }: { onToast: Toast }) {
  const theme = useTheme();
  const [status, setStatus] = useState<NotificationPermissionState>('undetermined');
  const [busy, setBusy] = useState(true);
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const next = await getNotificationPermissionState();
        if (active) setStatus(next);
      } catch {
        if (active) setStatus('undetermined');
      } finally {
        if (active) setBusy(false);
      }
    };
    void refresh();
    const subscription = AppState.addEventListener('change', next => {
      if (next === 'active') void refresh();
    });
    return () => { active = false; subscription.remove(); };
  }, []);
  const enable = async () => { setBusy(true); try { const granted = await requestNotificationPermission(); const next = await getNotificationPermissionState(); setStatus(next); onToast(granted ? 'Notifications enabled' : 'Notification permission was not granted', granted ? 'success' : 'error'); } catch (error) { onToast(friendlyError(error, 'Notification settings could not be updated.'), 'error'); } finally { setBusy(false); } };
  const openSettings = async () => { try { await Linking.openSettings(); } catch (error) { onToast(friendlyError(error, 'Device settings could not be opened.'), 'error'); } };
  const label = status === 'granted' ? 'Enabled' : status === 'denied' ? 'Blocked in device settings' : status === 'unsupported' ? 'Unavailable on web' : 'Not enabled';
  return <PanelScroll><PanelIntro icon="notifications-outline" title="Career reminders" copy="JobTrack uses device notifications for reminders you explicitly schedule from interviews." /><View style={[styles.statusCard, { backgroundColor: status === 'granted' ? theme.successMuted : theme.surface, borderColor: theme.border }]}><Ionicons name={status === 'granted' ? 'checkmark-circle' : 'notifications-off-outline'} size={24} color={status === 'granted' ? theme.success : theme.textSecondary} /><View style={{ flex: 1 }}><Text style={[typography.cardTitle, { color: theme.textPrimary }]}>Notification permission</Text><Text style={[typography.caption, { color: theme.textSecondary }]}>{busy ? 'Checking…' : label}</Text></View></View>{status !== 'unsupported' && status !== 'granted' ? <PrimaryButton title={busy ? 'Checking…' : status === 'denied' ? 'Open device settings' : 'Enable notifications'} disabled={busy} onPress={status === 'denied' ? openSettings : enable} /> : null}</PanelScroll>;
}

function DocumentsPanel({ demo, onToast }: { demo: boolean; onToast: Toast }) {
  const theme = useTheme();
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [loading, setLoading] = useState(!demo);
  const load = async () => { if (demo) return; setLoading(true); try { setDocuments(await getAllDocuments()); } catch (error) { onToast(friendlyError(error, 'Documents could not be loaded.'), 'error'); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, [demo]);
  const upload = async () => { try { const document = await pickAndUploadDocument('OTHER'); if (!document) return; setDocuments(current => [document, ...current]); onToast('Document uploaded'); } catch (error) { onToast(friendlyError(error, 'Document upload failed.'), 'error'); } };
  const open = async (document: StoredDocument) => { try { await Linking.openURL(await getTemporaryDocumentUrl(document.storage_path)); } catch (error) { onToast(friendlyError(error, 'Document could not be opened.'), 'error'); } };
  const remove = (document: StoredDocument) => Alert.alert('Delete document?', document.name, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => void (async () => { try { await deleteDocument(document); setDocuments(current => current.filter(item => item.id !== document.id)); onToast('Document deleted'); } catch (error) { onToast(friendlyError(error, 'Document could not be deleted.'), 'error'); } })() }]);
  return <PanelScroll><PanelIntro icon="document-text-outline" title="Private documents" copy="Files are read from your authenticated Supabase document records and private storage paths." />{demo ? <InfoCard icon="lock-closed-outline" title="Sign in to manage documents" copy="Document management is unavailable in local demo mode." /> : <><PrimaryButton title="Upload document" icon="cloud-upload-outline" onPress={upload} />{loading ? <Text style={[typography.body, { color: theme.textSecondary }]}>Loading documents…</Text> : documents.length ? <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.border }]}>{documents.map((document, index) => <React.Fragment key={document.id}><View style={styles.documentRow}><Pressable onPress={() => void open(document)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}><View style={[styles.rowIcon, { backgroundColor: theme.surfaceSecondary }]}><Ionicons name="document-outline" size={20} color={theme.textPrimary} /></View><View style={{ flex: 1 }}><Text numberOfLines={1} style={[typography.bodyMedium, { color: theme.textPrimary }]}>{document.name}</Text><Text style={[typography.caption, { color: theme.textSecondary }]}>{document.document_type.replace('_', ' ')} · {formatSize(document.size_bytes)}</Text></View></Pressable><Pressable accessibilityLabel={`Delete ${document.name}`} onPress={() => remove(document)} hitSlop={8}><Ionicons name="trash-outline" size={19} color={theme.danger} /></Pressable></View>{index < documents.length - 1 ? <Divider /> : null}</React.Fragment>)}</View> : <InfoCard icon="document-outline" title="No documents yet" copy="Upload a document here or from an application." />}</>}</PanelScroll>;
}

function PrivacyPanel({ profile, demo, onToast }: { profile: Profile | null; demo: boolean; onToast: Toast }) {
  const [busy, setBusy] = useState(false);
  const reset = async () => { if (!profile?.email || demo) return onToast('Sign in to manage account security', 'error'); setBusy(true); try { await sendPasswordReset(profile.email); onToast('Password reset email sent'); } catch (error) { onToast(friendlyError(error, 'Unable to send the reset email.'), 'error'); } finally { setBusy(false); } };
  return <PanelScroll><PanelIntro icon="shield-checkmark-outline" title="Privacy & security" copy="Your authenticated records are protected by Supabase row-level security, and uploaded files use private user-owned paths." /><InfoCard icon="person-outline" title="Account" copy={profile?.email || (demo ? 'Local demo session' : 'Authenticated JobTrack account')} /><InfoCard icon="lock-closed-outline" title="Private data" copy="Applications, profile data, AI history, and documents are scoped to the signed-in user." />{!demo ? <PrimaryButton title={busy ? 'Sending…' : 'Send password reset email'} disabled={busy || !profile?.email} onPress={reset} /> : null}</PanelScroll>;
}

function HelpPanel() {
  return <PanelScroll><PanelIntro icon="help-circle-outline" title="Using JobTrack" copy="Quick guidance for the features available in this build." /><InfoCard icon="briefcase-outline" title="Applications" copy="Add opportunities, update their stages, and manage interviews and documents from each application." /><InfoCard icon="sparkles-outline" title="AI Career" copy="Real analysis features require a configured server-side AI provider. Interview Coach supports explicit development practice mode." /><InfoCard icon="notifications-outline" title="Reminders" copy="Open an interview and use its reminder action after enabling device notification permission." /><InfoCard icon="cloud-offline-outline" title="Connection issues" copy="Confirm your internet connection and Supabase environment values, then restart Expo if configuration changed." /></PanelScroll>;
}

function AboutPanel() {
  return <PanelScroll><PanelIntro icon="information-circle-outline" title="JobTrack" copy="A private workspace for organizing job applications and career activity." /><InfoCard icon="phone-portrait-outline" title="Version" copy="1.0.0 · Expo SDK 57" /><InfoCard icon="server-outline" title="Data architecture" copy="Authenticated application data is stored in Supabase. Device appearance preferences remain local to this device." /></PanelScroll>;
}

function PanelIntro({ icon, title, copy }: { icon: keyof typeof Ionicons.glyphMap; title: string; copy: string }) {
  const theme = useTheme();
  return <View style={styles.intro}><View style={[styles.introIcon, { backgroundColor: theme.primaryMuted }]}><Ionicons name={icon} size={24} color={theme.primary} /></View><Text style={[typography.screenTitle, { color: theme.textPrimary }]}>{title}</Text><Text style={[typography.body, { color: theme.textSecondary, textAlign: 'center' }]}>{copy}</Text></View>;
}

function PanelLink({ icon, title, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; onPress: () => void }) {
  const theme = useTheme();
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.linkRow, { opacity: pressed ? 0.65 : 1 }]}><View style={[styles.rowIcon, { backgroundColor: theme.surfaceSecondary }]}><Ionicons name={icon} size={20} color={theme.textPrimary} /></View><Text style={[typography.bodyMedium, { color: theme.textPrimary, flex: 1 }]}>{title}</Text><Ionicons name="chevron-forward" size={18} color={theme.textSecondary} /></Pressable>;
}

function InfoCard({ icon, title, copy }: { icon: keyof typeof Ionicons.glyphMap; title: string; copy: string }) {
  const theme = useTheme();
  return <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}><View style={[styles.rowIcon, { backgroundColor: theme.surfaceSecondary }]}><Ionicons name={icon} size={20} color={theme.textPrimary} /></View><View style={{ flex: 1 }}><Text style={[typography.cardTitle, { color: theme.textPrimary }]}>{title}</Text><Text style={[typography.bodyMedium, { color: theme.textSecondary, marginTop: 3 }]}>{copy}</Text></View></View>;
}

function Divider() { const theme = useTheme(); return <View style={[styles.divider, { backgroundColor: theme.border }]} />; }
function CancelButton({ onPress }: { onPress: () => void }) { const theme = useTheme(); return <Pressable onPress={onPress} style={styles.cancel}><Text style={[typography.bodyMedium, { color: theme.textSecondary }]}>Cancel</Text></Pressable>; }
function formatSize(size: number | null) { if (!size) return 'Size unavailable'; return size >= 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(size / 1024)} KB`; }

const styles = StyleSheet.create({
  root: { flex: 1 }, header: { minHeight: 68, borderBottomWidth: 1, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, iconButton: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, content: { padding: spacing.lg, paddingBottom: spacing.huge, gap: spacing.xl }, intro: { alignItems: 'center', gap: spacing.sm }, introIcon: { width: 52, height: 52, borderRadius: 17, alignItems: 'center', justifyContent: 'center' }, group: { borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: spacing.md, overflow: 'hidden' }, switchRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, linkRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, rowIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, divider: { height: 1, marginLeft: 52 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }, chip: { borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: spacing.sm, paddingVertical: 8 }, addRow: { flexDirection: 'row', gap: spacing.sm }, skillInput: { flex: 1, minHeight: 50, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.md, fontSize: 15 }, addButton: { width: 50, minHeight: 50, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' }, skillList: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }, skillTag: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: spacing.xs }, cancel: { alignItems: 'center', paddingVertical: spacing.sm }, completionHero: { alignItems: 'center', gap: spacing.sm }, largeRing: { width: 116, height: 116, borderRadius: 58, borderWidth: 9, alignItems: 'center', justifyContent: 'center' }, percentage: { fontSize: 28, fontWeight: '700' }, checkRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, statusCard: { minHeight: 76, borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, documentRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, infoCard: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
});
