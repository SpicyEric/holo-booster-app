/**
 * Cross-platform persistent storage backed by @capacitor/preferences on native
 * and localStorage on web. Used for offline cache + scan queue.
 */
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();

export const persistentStorage = {
  async get(key: string): Promise<string | null> {
    if (isNative) {
      const { value } = await Preferences.get({ key });
      return value ?? null;
    }
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  async set(key: string, value: string): Promise<void> {
    if (isNative) {
      await Preferences.set({ key, value });
      return;
    }
    try {
      localStorage.setItem(key, value);
    } catch {
      // Quota errors silently ignored
    }
  },
  async remove(key: string): Promise<void> {
    if (isNative) {
      await Preferences.remove({ key });
      return;
    }
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  },
};
