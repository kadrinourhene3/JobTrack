import React, { ReactNode, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { getApplicationStatusConfig } from './applicationStatuses';
import { useTheme } from './context';
import type { Application, DisplayStatus as Status } from './types/domain';
import { radius, spacing, typography } from './theme';

export function IconButton({ name, onPress, label }: { name: keyof typeof Ionicons.glyphMap; onPress?: () => void; label: string }) {
  const theme = useTheme();
  return (
    <Pressable accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.iconButton, { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.65 : 1 }]}>
      <Ionicons name={name} size={20} color={theme.textPrimary} />
    </Pressable>
  );
}

export function Logo({ initials, color, size = 46 }: { initials: string; color: string; size?: number }) {
  const theme = useTheme();
  return (
    <View style={[styles.logo, { width: size, height: size, borderRadius: size * 0.28, backgroundColor: color, borderColor: theme.dark ? theme.border : 'rgba(21,23,28,0.06)' }]}>
      <Text style={{ color: '#fff', fontSize: size * 0.4, fontWeight: '700', letterSpacing: -0.5 }}>{initials}</Text>
    </View>
  );
}

export function StatusBadge({ status }: { status: Status }) {
  const theme = useTheme();
  const config = getApplicationStatusConfig(status);
  return (
    <View style={[styles.badge, { backgroundColor: theme[config.backgroundToken] as string }]}>
      <Ionicons name={config.icon} size={13} color={theme[config.colorToken] as string} />
      <Text style={[styles.badgeText, { color: theme[config.colorToken] as string }]}>{status}</Text>
    </View>
  );
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const theme = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[typography.sectionTitle, { color: theme.textPrimary }]}>{title}</Text>
      {action ? <Pressable onPress={onAction} hitSlop={8}><Text style={[typography.bodyMedium, { color: theme.primary }]}>{action}</Text></Pressable> : null}
    </View>
  );
}

export function AppCard({ item, onPress, compact = false }: { item: Application; onPress?: () => void; compact?: boolean }) {
  const theme = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const press = (toValue: number) => Animated.spring(scale, { toValue, useNativeDriver: true, speed: 30, bounciness: 2 }).start();
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPressIn={() => press(0.985)}
        onPressOut={() => press(1)}
        onPress={() => { Haptics.selectionAsync(); onPress?.(); }}
        style={[styles.appCard, compact && styles.appCardCompact, { backgroundColor: theme.surface, borderColor: theme.border }]}
      >
        <View style={styles.appCardTop}>
          <Logo initials={item.initials} color={item.logoColor} size={compact ? 38 : 46} />
          <View style={styles.appCardTitle}>
            <Text numberOfLines={1} style={[typography.cardTitle, { color: theme.textPrimary }]}>{item.title}</Text>
            <Text style={[typography.bodyMedium, { color: theme.textSecondary }]}>{item.company}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
        </View>
        {!compact && (
          <View style={styles.metaRow}>
            <View style={styles.metaItem}><Ionicons name="location-outline" size={14} color={theme.textSecondary} /><Text style={[typography.caption, { color: theme.textSecondary }]}>{item.location}</Text></View>
            <View style={[styles.metaDot, { backgroundColor: theme.border }]} />
            <Text style={[typography.caption, { color: theme.textSecondary }]}>{item.mode}</Text>
            {item.salary ? <><View style={[styles.metaDot, { backgroundColor: theme.border }]} /><Text style={[typography.caption, { color: theme.textSecondary }]}>{item.salary}</Text></> : null}
          </View>
        )}
        <View style={[styles.appCardBottom, compact && { marginTop: spacing.sm }]}>
          <View style={styles.priorityLine}>
            <View style={[styles.priorityDot, { backgroundColor: item.priority === 'High' ? theme.danger : item.priority === 'Medium' ? theme.warning : theme.textSecondary }]} />
            <Text style={[typography.caption, { color: theme.textSecondary }]}>{compact ? item.company : `Applied ${item.age}`}</Text>
          </View>
          <StatusBadge status={item.status} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function ProgressBar({ value, color, height = 7 }: { value: number; color?: string; height?: number }) {
  const theme = useTheme();
  const width = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(width, { toValue: value, duration: 700, useNativeDriver: false }).start(); }, [value]);
  return (
    <View style={{ height, borderRadius: radius.pill, overflow: 'hidden', backgroundColor: theme.surfaceSecondary }}>
      <Animated.View style={{ height: '100%', borderRadius: radius.pill, backgroundColor: color || theme.primary, width: width.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }} />
    </View>
  );
}

export function PrimaryButton({ title, icon, onPress, disabled, style }: { title: string; icon?: keyof typeof Ionicons.glyphMap; onPress?: () => void; disabled?: boolean; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return (
    <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress?.(); }} disabled={disabled} style={({ pressed }) => [styles.primaryButton, { backgroundColor: theme.primary, opacity: disabled ? 0.45 : pressed ? 0.82 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] }, style]}>
      {icon ? <Ionicons name={icon} size={18} color="#fff" /> : null}
      <Text style={styles.primaryButtonText}>{title}</Text>
    </Pressable>
  );
}

export function Field({ label, icon, error, ...props }: TextInputProps & { label: string; icon?: keyof typeof Ionicons.glyphMap; error?: string }) {
  const theme = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={[typography.label, { color: theme.textSecondary }]}>{label.toUpperCase()}</Text>
      <View style={[styles.inputShell, { backgroundColor: theme.surface, borderColor: error ? theme.danger : theme.border }]}>
        {icon ? <Ionicons name={icon} size={18} color={theme.textSecondary} /> : null}
        <TextInput placeholderTextColor={theme.textSecondary} style={[styles.input, { color: theme.textPrimary }]} {...props} />
      </View>
      {error ? <Text style={[typography.caption, { color: theme.danger }]}>{error}</Text> : null}
    </View>
  );
}

export function FadeIn({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 330, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 330, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>{children}</Animated.View>;
}

export type ToastType = 'success' | 'error';

export function Toast({ message, type, visible, bottom }: { message: string; type: ToastType; visible: boolean; bottom: number }) {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const y = useRef(new Animated.Value(18)).current;
  const animation = useRef<Animated.CompositeAnimation | null>(null);
  const [rendered, setRendered] = useState(visible);

  useEffect(() => {
    animation.current?.stop();
    if (visible) {
      setRendered(true);
      opacity.setValue(0);
      y.setValue(18);
      animation.current = Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(y, { toValue: 0, speed: 24, bounciness: 2, useNativeDriver: true }),
      ]);
      animation.current.start();
    } else {
      animation.current = Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(y, { toValue: 18, duration: 220, useNativeDriver: true }),
      ]);
      animation.current.start(({ finished }) => { if (finished) setRendered(false); });
    }
    return () => animation.current?.stop();
  }, [visible]);

  if (!visible && !rendered) return null;
  const accent = type === 'error' ? theme.danger : theme.success;
  return (
    <Animated.View pointerEvents="none" accessibilityLiveRegion="polite" style={[styles.toast, { bottom, backgroundColor: theme.textPrimary, opacity, transform: [{ translateY: y }] }]}>
      <View style={[styles.toastCheck, { backgroundColor: accent }]}><Ionicons name={type === 'error' ? 'alert' : 'checkmark'} size={14} color="#fff" /></View>
      <Text style={[typography.bodyMedium, { color: theme.background, flexShrink: 1 }]}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  iconButton: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  badge: { height: 28, paddingHorizontal: 10, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', gap: 5 },
  badgeText: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  appCard: { borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, marginBottom: spacing.sm },
  appCardCompact: { width: 210, marginRight: spacing.sm, marginBottom: 0 },
  appCardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  appCardTitle: { flex: 1, gap: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7, marginTop: spacing.md },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaDot: { width: 3, height: 3, borderRadius: 3 },
  appCardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md },
  priorityLine: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  priorityDot: { width: 6, height: 6, borderRadius: 4 },
  primaryButton: { minHeight: 50, borderRadius: radius.md, paddingHorizontal: spacing.lg, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.xs },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  inputShell: { height: 50, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  input: { flex: 1, fontSize: 15, height: '100%' },
  toast: { position: 'absolute', alignSelf: 'center', maxWidth: '90%', minHeight: 48, borderRadius: radius.md, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, zIndex: 100, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 20 },
  toastCheck: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
});
