import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const profileScreen = readFileSync(new URL('../src/screens/ProfileScreen.tsx', import.meta.url), 'utf8');
const profilePanels = readFileSync(new URL('../src/components/ProfilePanels.tsx', import.meta.url), 'utf8');
const editProfile = readFileSync(new URL('../src/components/EditProfileModal.tsx', import.meta.url), 'utf8');
const authStore = readFileSync(new URL('../src/stores/authStore.ts', import.meta.url), 'utf8');
const authService = readFileSync(new URL('../src/services/authService.ts', import.meta.url), 'utf8');
const settingsStore = readFileSync(new URL('../src/stores/settingsStore.ts', import.meta.url), 'utf8');

test('every Profile row with a chevron is wired to a real panel', () => {
  for (const panel of ['role', 'location', 'skills', 'notifications', 'documents', 'privacy', 'help', 'about']) {
    assert.match(profileScreen, new RegExp(`onPress=\\{\\(\\) => setPanel\\('${panel}'\\)\\}`));
  }
  assert.match(profileScreen, /label="Settings" onPress=\{\(\) => setPanel\('settings'\)\}/);
  assert.match(profileScreen, /accessibilityLabel=\{`Profile completion .*onPress=\{\(\) => setPanel\('completion'\)\}/s);
});

test('avatar, Edit Profile, appearance, and sign-out controls remain wired', () => {
  assert.match(profileScreen, /accessibilityLabel="Change profile photo" onPress=\{\(\) => void chooseAvatar\(\)\}/);
  assert.match(profileScreen, /<Pressable onPress=\{openEditor\}/);
  assert.match(profileScreen, /<Switch value=\{dark\} onValueChange=\{onDark\}/);
  assert.match(profileScreen, /onPress=\{onSignOut\}/);
});

test('dedicated editors and full Edit Profile use the same profile fields', () => {
  assert.match(profilePanels, /onSave\(\{ current_job_title: role \}\)/);
  assert.match(profilePanels, /onSave\(\{ city: city\.trim\(\) \|\| null, country: country\.trim\(\) \|\| null \}\)/);
  assert.match(profilePanels, /onSave\(\{ skills: normalizeSkills\(skills\) \}\)/);
  assert.match(editProfile, /name="currentJobTitle" label="Target role"/);
  assert.match(editProfile, /currentJobTitle: profile\?\.current_job_title \|\| ''/);
  assert.match(editProfile, /skills: profile\?\.skills\.join\(', '\) \|\| ''/);
});

test('profile saves update Supabase and replace the in-memory profile', () => {
  assert.match(authStore, /saveProfileFields: async updates/);
  assert.match(authStore, /authService\.updateProfile\(session\.user\.id/);
  assert.match(authStore, /set\(\{ profile, busy: false \}\)/);
  assert.match(authService, /from\('profiles'\)\.update\(updates\)\.eq\('id', userId\)\.select\('\*'\)\.single\(\)/);
});

test('settings and secondary Profile panels use real existing capabilities', () => {
  assert.match(settingsStore, /AsyncStorage\.setItem\('jobtrack-theme'/);
  assert.match(profilePanels, /getNotificationPermissionState\(\)/);
  assert.match(profilePanels, /requestNotificationPermission\(\)/);
  assert.match(profilePanels, /getAllDocuments\(\)/);
  assert.match(profilePanels, /sendPasswordReset\(profile\.email\)/);
});

test('Profile implementation contains no known placeholder callbacks', () => {
  const combined = `${profileScreen}\n${profilePanels}`;
  assert.doesNotMatch(combined, /Settings are up to date|demo files|coming soon|not implemented|onPress=\{\(\) => \{\}\}/i);
});

test('shared Profile panel close button uses an iOS safe-area offset without moving the title', () => {
  assert.match(profilePanels, /const insets = useSafeAreaInsets\(\)/);
  assert.match(profilePanels, /Math\.min\(31, Math\.max\(27, insets\.top \/ 5 \+ 19\)\)/);
  assert.match(profilePanels, /transform: \[\{ translateY: closeButtonTopOffset \}\]/);
  assert.doesNotMatch(profilePanels, /header, \{[^}]*paddingTop: insets\.top/s);
});
