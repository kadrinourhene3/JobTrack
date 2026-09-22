export const palette = {
  primary: '#5B5FEF',
  primaryDark: '#4649D8',
  secondary: '#7C3AED',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
  ink: '#15171C',
  white: '#FFFFFF',
};

export const spacing = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32, xxxl: 40, huge: 48 };
export const radius = { sm: 10, md: 14, lg: 18, xl: 24, pill: 999 };

export const lightTheme = {
  dark: false,
  background: '#F6F7FB',
  surface: '#FFFFFF',
  surfaceSecondary: '#F0F2F7',
  textPrimary: '#15171C',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  primary: palette.primary,
  primaryMuted: '#EEEEFF',
  success: palette.success,
  successMuted: '#EAF9EF',
  warning: palette.warning,
  warningMuted: '#FFF6E5',
  danger: palette.danger,
  dangerMuted: '#FDECEC',
  info: palette.info,
  infoMuted: '#EAF2FF',
  purpleMuted: '#F2EBFF',
  overlay: 'rgba(13,15,20,0.45)',
};

export const darkTheme: Theme = {
  ...lightTheme,
  dark: true,
  background: '#0D0F14',
  surface: '#151820',
  surfaceSecondary: '#1C2029',
  textPrimary: '#F8FAFC',
  textSecondary: '#9CA3AF',
  border: '#272B35',
  primary: '#777AF5',
  primaryMuted: '#292B55',
  successMuted: '#173426',
  warningMuted: '#3A2B15',
  dangerMuted: '#3D1D22',
  infoMuted: '#192D4D',
  purpleMuted: '#2C2042',
  overlay: 'rgba(0,0,0,0.68)',
};

export type Theme = typeof lightTheme;

export const typography = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: '700' as const, letterSpacing: -1.1 },
  screenTitle: { fontSize: 28, lineHeight: 34, fontWeight: '700' as const, letterSpacing: -0.6 },
  sectionTitle: { fontSize: 19, lineHeight: 25, fontWeight: '600' as const, letterSpacing: -0.2 },
  cardTitle: { fontSize: 16, lineHeight: 22, fontWeight: '600' as const },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' as const },
  bodyMedium: { fontSize: 14, lineHeight: 20, fontWeight: '500' as const },
  caption: { fontSize: 12, lineHeight: 17, fontWeight: '400' as const },
  label: { fontSize: 12, lineHeight: 16, fontWeight: '600' as const, letterSpacing: 0.45 },
};
