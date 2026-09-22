import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { z } from 'zod';
import { Field, PrimaryButton } from '../../components';
import { useTheme } from '../../context';
import { useAuthStore } from '../../stores/authStore';
import { radius, spacing, typography } from '../../theme';

const schema = z.object({
  currentJobTitle: z.string().trim().min(2, 'Tell us your current or desired role.'),
  city: z.string().trim().min(2, 'Enter your city.'),
  country: z.string().trim().min(2, 'Enter your country.'),
  careerGoal: z.string().trim().min(10, 'Add a little more detail about your goal.'),
  skills: z.string().trim().min(2, 'Add at least one skill.'),
});
type Values = z.infer<typeof schema>;

export function OnboardingScreen() {
  const theme = useTheme(); const complete = useAuthStore(state => state.completeOnboarding); const busy = useAuthStore(state => state.busy); const error = useAuthStore(state => state.error);
  const { control, handleSubmit, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { currentJobTitle: '', city: '', country: '', careerGoal: '', skills: '' } });
  const submit = (values: Values) => complete({ current_job_title: values.currentJobTitle, city: values.city, country: values.country, career_goal: values.careerGoal, skills: values.skills.split(',').map(skill => skill.trim()).filter(Boolean) });
  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}><View style={[styles.step, { backgroundColor: theme.primaryMuted }]}><Ionicons name="sparkles" size={18} color={theme.primary} /><Text style={[typography.label, { color: theme.primary }]}>ONE QUICK STEP</Text></View><View><Text style={[typography.screenTitle, { color: theme.textPrimary }]}>Personalize your workspace</Text><Text style={[typography.body, { color: theme.textSecondary, marginTop: spacing.xs }]}>We’ll use this to make your dashboard and AI guidance more relevant.</Text></View><View style={styles.form}><Controller control={control} name="currentJobTitle" render={({ field }) => <Field label="Current or target role" icon="briefcase-outline" value={field.value} onChangeText={field.onChange} placeholder="Product Designer" error={errors.currentJobTitle?.message} />} /><View style={styles.row}><View style={{ flex: 1 }}><Controller control={control} name="city" render={({ field }) => <Field label="City" value={field.value} onChangeText={field.onChange} placeholder="Algiers" error={errors.city?.message} />} /></View><View style={{ flex: 1 }}><Controller control={control} name="country" render={({ field }) => <Field label="Country" value={field.value} onChangeText={field.onChange} placeholder="Algeria" error={errors.country?.message} />} /></View></View><Controller control={control} name="careerGoal" render={({ field }) => <Field label="Career goal" icon="flag-outline" value={field.value} onChangeText={field.onChange} placeholder="Move into a senior product role…" error={errors.careerGoal?.message} />} /><Controller control={control} name="skills" render={({ field }) => <Field label="Skills" icon="layers-outline" value={field.value} onChangeText={field.onChange} placeholder="Figma, Research, React" error={errors.skills?.message} />} />{error && <View style={[styles.error, { backgroundColor: theme.dangerMuted }]}><Text style={[typography.bodyMedium, { color: theme.danger }]}>{error}</Text></View>}<PrimaryButton title={busy ? 'Saving…' : 'Enter JobTrack'} icon="arrow-forward" disabled={busy} onPress={handleSubmit(submit)} /></View></ScrollView></KeyboardAvoidingView>;
}

const styles = StyleSheet.create({ content: { flexGrow: 1, padding: spacing.xl, paddingTop: spacing.huge, gap: spacing.xxl }, step: { alignSelf: 'flex-start', height: 34, borderRadius: radius.pill, paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.xs }, form: { gap: spacing.lg }, row: { flexDirection: 'row', gap: spacing.sm }, error: { borderRadius: radius.md, padding: spacing.sm } });
