import React, { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { APPLICATION_STATUS_VALUES, toSelectableApplicationStatus } from '../applicationStatuses';
import type { ApplicationStatus } from '../applicationStatuses';
import { Field, PrimaryButton } from '../components';
import { useTheme } from '../context';
import { applicationSchema, type ApplicationFormValues } from '../schemas/applicationSchema';
import { radius, spacing, typography } from '../theme';

const defaults: ApplicationFormValues = {
  companyName: '', jobTitle: '', location: '', jobUrl: '', workMode: 'REMOTE', status: 'APPLIED', priority: 'MEDIUM', source: '', salaryMin: '', salaryMax: '', currency: 'USD', notes: '',
};

type ApplicationFormInitialValues = Omit<Partial<ApplicationFormValues>, 'status'> & { status?: ApplicationStatus };

export function AddApplicationModal({ visible, title = 'Add application', initialValues, onClose, onSave }: { visible: boolean; title?: string; initialValues?: ApplicationFormInitialValues; onClose: () => void; onSave: (values: ApplicationFormValues) => Promise<boolean> }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { control, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<ApplicationFormValues>({ resolver: zodResolver(applicationSchema), defaultValues: defaults });
  useEffect(() => {
    if (visible) reset({ ...defaults, ...initialValues, status: initialValues?.status ? toSelectableApplicationStatus(initialValues.status) : defaults.status });
  }, [visible]);
  const status = watch('status');
  const workMode = watch('workMode');
  const submit = async (values: ApplicationFormValues) => { if (await onSave(values)) { reset(defaults); onClose(); } };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalRoot}>
        <Pressable onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: theme.overlay }]} />
        <View style={[styles.sheet, { backgroundColor: theme.background, paddingBottom: Math.max(insets.bottom, spacing.xxl) }]}>
          <View style={[styles.handle, { backgroundColor: theme.border }]} />
          <View style={styles.sheetHeader}>
            <View>
              <Text style={[typography.sectionTitle, { color: theme.textPrimary }]}>{title}</Text>
              <Text style={[typography.bodyMedium, { color: theme.textSecondary, marginTop: 2 }]}>{initialValues ? 'Keep this opportunity accurate and current.' : 'Start tracking a new opportunity.'}</Text>
            </View>
            <Pressable onPress={onClose} style={[styles.close, { backgroundColor: theme.surfaceSecondary }]}><Ionicons name="close" size={21} color={theme.textPrimary} /></Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
            <Controller control={control} name="companyName" render={({ field }) => <Field label="Company" icon="business-outline" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} placeholder="e.g. Linear" error={errors.companyName?.message} />} />
            <Controller control={control} name="jobTitle" render={({ field }) => <Field label="Role" icon="briefcase-outline" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} placeholder="e.g. Product Designer" error={errors.jobTitle?.message} />} />
            <Controller control={control} name="location" render={({ field }) => <Field label="Location" icon="location-outline" value={field.value} onChangeText={field.onChange} placeholder="City or remote" error={errors.location?.message} />} />
            <Controller control={control} name="jobUrl" render={({ field }) => <Field label="Job URL" icon="link-outline" autoCapitalize="none" keyboardType="url" value={field.value} onChangeText={field.onChange} placeholder="https://…" error={errors.jobUrl?.message} />} />
            <ChoiceGroup label="WORK MODE" values={['REMOTE', 'HYBRID', 'ONSITE']} selected={workMode} onSelect={value => setValue('workMode', value as ApplicationFormValues['workMode'])} />
            <ChoiceGroup label="STATUS" values={APPLICATION_STATUS_VALUES} selected={status} onSelect={value => setValue('status', value as ApplicationFormValues['status'])} />
            <View style={styles.row}>
              <View style={{ flex: 1 }}><Controller control={control} name="salaryMin" render={({ field }) => <Field label="Salary min" icon="cash-outline" keyboardType="numeric" value={field.value} onChangeText={field.onChange} placeholder="Optional" />} /></View>
              <View style={{ flex: 1 }}><Controller control={control} name="salaryMax" render={({ field }) => <Field label="Salary max" keyboardType="numeric" value={field.value} onChangeText={field.onChange} placeholder="Optional" error={errors.salaryMax?.message} />} /></View>
            </View>
            <Controller control={control} name="source" render={({ field }) => <Field label="Source" icon="navigate-outline" value={field.value} onChangeText={field.onChange} placeholder="LinkedIn, referral…" />} />
            <PrimaryButton title={isSubmitting ? 'Saving…' : initialValues ? 'Update application' : 'Save application'} icon="checkmark" disabled={isSubmitting} onPress={handleSubmit(submit)} style={{ marginTop: spacing.xs }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ChoiceGroup({ label, values, selected, onSelect }: { label: string; values: readonly string[]; selected: string; onSelect: (value: string) => void }) {
  const theme = useTheme();
  return (
    <View>
      <Text style={[typography.label, { color: theme.textSecondary, marginBottom: spacing.xs }]}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choices}>
        {values.map(value => <Pressable key={value} onPress={() => onSelect(value)} style={[styles.choice, { backgroundColor: selected === value ? theme.primaryMuted : theme.surface, borderColor: selected === value ? theme.primary : theme.border }]}><Text style={[typography.bodyMedium, { color: selected === value ? theme.primary : theme.textSecondary }]}>{value === 'ONSITE' ? 'ON-SITE' : value}</Text></Pressable>)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({ modalRoot: { flex: 1, justifyContent: 'flex-end' }, sheet: { maxHeight: '90%', borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl }, handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: spacing.sm }, sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.lg }, close: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, form: { gap: spacing.lg, paddingBottom: spacing.xl }, row: { flexDirection: 'row', gap: spacing.sm }, choices: { gap: spacing.xs }, choice: { height: 38, paddingHorizontal: spacing.md, borderRadius: radius.sm, borderWidth: 1, alignItems: 'center', justifyContent: 'center' } });
