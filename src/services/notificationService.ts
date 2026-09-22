import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('reminders', { name: 'Career reminders', importance: Notifications.AndroidImportance.DEFAULT });
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export type NotificationPermissionState = 'granted' | 'denied' | 'undetermined' | 'unsupported';

export async function getNotificationPermissionState(): Promise<NotificationPermissionState> {
  if (Platform.OS === 'web') return 'unsupported';
  const permission = await Notifications.getPermissionsAsync();
  if (permission.granted) return 'granted';
  return permission.status === 'denied' ? 'denied' : 'undetermined';
}

export async function scheduleReminder(title: string, body: string, at: Date, data: Record<string, string> = {}): Promise<string> {
  if (!(await requestNotificationPermission())) throw new Error('Notification permission was not granted.');
  return Notifications.scheduleNotificationAsync({ content: { title, body, data }, trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at } });
}

export async function cancelReminder(identifier: string): Promise<void> { await Notifications.cancelScheduledNotificationAsync(identifier); }
