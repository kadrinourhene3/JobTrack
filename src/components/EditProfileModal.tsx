import React, { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Field, PrimaryButton } from '../components';
import { useTheme } from '../context';
import { profileSchema, type ProfileFormValues } from '../schemas/profileSchema';
import { spacing, typography } from '../theme';
import type { Profile } from '../types/domain';

type EditProfileModalProps = {
  visible: boolean;
  profile: Profile | null;
  onClose: () => void;
  onSave: (values: ProfileFormValues) => Promise<boolean>;
};

export function EditProfileModal({ visible, profile, onClose, onSave }: EditProfileModalProps) {
  const theme = useTheme();
  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: profileValues(profile),
  });

  useEffect(() => {
    reset(profileValues(profile));
  }, [profile, reset, visible]);

  const submit = async (values: ProfileFormValues) => {
    if (await onSave(values)) onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Pressable accessibilityLabel="Close" onPress={onClose} style={[styles.iconButton, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="close" size={21} color={theme.textPrimary} />
          </Pressable>
          <Text style={[typography.cardTitle, { color: theme.textPrimary }]}>Edit profile</Text>
          <View style={{ width: 44 }} />
        </View>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
            <View style={styles.row}>
              <FormController control={control} name="firstName" label="First name" error={errors.firstName?.message} />
              <FormController control={control} name="lastName" label="Last name" error={errors.lastName?.message} />
            </View>
            <FormController control={control} name="currentJobTitle" label="Target role" icon="briefcase-outline" error={errors.currentJobTitle?.message} />
            <View style={styles.row}>
              <FormController control={control} name="city" label="City" error={errors.city?.message} />
              <FormController control={control} name="country" label="Country" error={errors.country?.message} />
            </View>
            <FormController control={control} name="phone" label="Phone" icon="call-outline" keyboardType="phone-pad" error={errors.phone?.message} />
            <FormController control={control} name="yearsOfExperience" label="Years of experience" icon="time-outline" keyboardType="numeric" error={errors.yearsOfExperience?.message} />
            <FormController control={control} name="careerGoal" label="Career goal" icon="flag-outline" error={errors.careerGoal?.message} />
            <FormController control={control} name="skills" label="Skills" icon="layers-outline" placeholder="Figma, Research, React" error={errors.skills?.message} />
            <FormController control={control} name="linkedinUrl" label="LinkedIn" icon="logo-linkedin" autoCapitalize="none" keyboardType="url" error={errors.linkedinUrl?.message} />
            <FormController control={control} name="githubUrl" label="GitHub" icon="logo-github" autoCapitalize="none" keyboardType="url" error={errors.githubUrl?.message} />
            <FormController control={control} name="portfolioUrl" label="Portfolio" icon="globe-outline" autoCapitalize="none" keyboardType="url" error={errors.portfolioUrl?.message} />
            <PrimaryButton title={isSubmitting ? 'Saving…' : 'Save profile'} disabled={isSubmitting} onPress={handleSubmit(submit)} />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

type Name = keyof ProfileFormValues;

function FormController({ control, name, label, error, icon, placeholder, keyboardType, autoCapitalize }: {
  control: ReturnType<typeof useForm<ProfileFormValues>>['control'];
  name: Name;
  label: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'phone-pad' | 'url';
  autoCapitalize?: 'none';
}) {
  return (
    <View style={{ flex: 1 }}>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Field
            label={label}
            icon={icon}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            placeholder={placeholder}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            error={error}
          />
        )}
      />
    </View>
  );
}

function profileValues(profile: Profile | null): ProfileFormValues {
  return {
    firstName: profile?.first_name || '',
    lastName: profile?.last_name || '',
    phone: profile?.phone || '',
    country: profile?.country || '',
    city: profile?.city || '',
    currentJobTitle: profile?.current_job_title || '',
    yearsOfExperience: profile?.years_of_experience?.toString() || '',
    careerGoal: profile?.career_goal || '',
    skills: profile?.skills.join(', ') || '',
    linkedinUrl: profile?.linkedin_url || '',
    githubUrl: profile?.github_url || '',
    portfolioUrl: profile?.portfolio_url || '',
  };
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { minHeight: 68, borderBottomWidth: 1, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconButton: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  form: { padding: spacing.lg, paddingBottom: spacing.huge, gap: spacing.lg },
  row: { flexDirection: 'row', gap: spacing.sm },
});
