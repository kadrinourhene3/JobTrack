export const APPLICATION_STATUS_OPTIONS = [
  { value: 'SAVED', label: 'Saved', icon: 'bookmark-outline', backgroundToken: 'surfaceSecondary', colorToken: 'textSecondary', nextValue: 'APPLIED' },
  { value: 'APPLIED', label: 'Applied', icon: 'paper-plane-outline', backgroundToken: 'infoMuted', colorToken: 'info', nextValue: 'SCREENING' },
  { value: 'SCREENING', label: 'Screening', icon: 'scan-outline', backgroundToken: 'purpleMuted', colorToken: 'primary', nextValue: 'INTERVIEW' },
  { value: 'INTERVIEW', label: 'Interview', icon: 'calendar-outline', backgroundToken: 'warningMuted', colorToken: 'warning', nextValue: 'OFFER' },
  { value: 'OFFER', label: 'Offer', icon: 'sparkles-outline', backgroundToken: 'successMuted', colorToken: 'success', nextValue: undefined },
  { value: 'REJECTED', label: 'Rejected', icon: 'close-outline', backgroundToken: 'dangerMuted', colorToken: 'danger', nextValue: undefined },
] as const;

export type UserSelectableApplicationStatus = typeof APPLICATION_STATUS_OPTIONS[number]['value'];
export type DisplayStatus = typeof APPLICATION_STATUS_OPTIONS[number]['label'];

export const APPLICATION_STATUS_ALIASES = {
  ASSESSMENT: 'SCREENING',
  FINAL_INTERVIEW: 'INTERVIEW',
  ACCEPTED: 'OFFER',
  WITHDRAWN: 'REJECTED',
} as const satisfies Record<string, UserSelectableApplicationStatus>;

export type ApplicationStatus = UserSelectableApplicationStatus | keyof typeof APPLICATION_STATUS_ALIASES;

export const APPLICATION_STATUS_VALUES = APPLICATION_STATUS_OPTIONS.map(option => option.value) as [
  UserSelectableApplicationStatus,
  ...UserSelectableApplicationStatus[],
];

export const APPLICATION_DATABASE_STATUSES = [
  ...APPLICATION_STATUS_VALUES,
  ...Object.keys(APPLICATION_STATUS_ALIASES) as (keyof typeof APPLICATION_STATUS_ALIASES)[],
] as ApplicationStatus[];

export function toSelectableApplicationStatus(status: ApplicationStatus): UserSelectableApplicationStatus {
  return status in APPLICATION_STATUS_ALIASES
    ? APPLICATION_STATUS_ALIASES[status as keyof typeof APPLICATION_STATUS_ALIASES]
    : status as UserSelectableApplicationStatus;
}

export function getApplicationStatusConfig(status: ApplicationStatus | DisplayStatus) {
  const value = status.includes('_') || status === status.toUpperCase()
    ? toSelectableApplicationStatus(status as ApplicationStatus)
    : APPLICATION_STATUS_OPTIONS.find(option => option.label === status)?.value;
  return APPLICATION_STATUS_OPTIONS.find(option => option.value === value) ?? APPLICATION_STATUS_OPTIONS[0];
}

export function toDisplayStatus(status: ApplicationStatus): DisplayStatus {
  return getApplicationStatusConfig(status).label;
}
