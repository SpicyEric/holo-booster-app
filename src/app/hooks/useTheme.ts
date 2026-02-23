import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';

const THEME_KEY = 'eloyo-dark-mode';

export const useTheme = () => {
  const [isDark, setIsDark] = useState(() => {
    try {
      return localStorage.getItem(THEME_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // Apply class to <html> on mount and change
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Update native status bar
    if (Capacitor.isNativePlatform()) {
      updateStatusBar(isDark);
    }
  }, [isDark]);

  const toggle = useCallback(() => {
    setIsDark(prev => {
      const next = !prev;
      try {
        localStorage.setItem(THEME_KEY, String(next));
      } catch {}
      return next;
    });
  }, []);

  return { isDark, toggle };
};

async function updateStatusBar(isDark: boolean) {
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    if (isDark) {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#212121' });
    } else {
      await StatusBar.setStyle({ style: Style.Light });
      await StatusBar.setBackgroundColor({ color: '#FFFFFF' });
    }
  } catch (e) {
    console.warn('StatusBar update failed:', e);
  }
}
