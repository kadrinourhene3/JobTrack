import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

type SettingsState = {
  dark: boolean;
  hydrated: boolean;
  hydrate: (systemDark: boolean) => Promise<void>;
  setDark: (dark: boolean) => Promise<void>;
};

export const useSettingsStore = create<SettingsState>(set => ({
  dark: false,
  hydrated: false,
  hydrate: async systemDark => {
    try { const value = await AsyncStorage.getItem('jobtrack-theme'); set({ dark: value ? value === 'dark' : systemDark, hydrated: true }); }
    catch { set({ dark: systemDark, hydrated: true }); }
  },
  setDark: async dark => {
    set({ dark });
    try { await AsyncStorage.setItem('jobtrack-theme', dark ? 'dark' : 'light'); } catch { /* Preference remains in memory. */ }
  },
}));
