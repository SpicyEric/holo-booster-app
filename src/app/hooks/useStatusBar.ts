import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

/**
 * Configure the native status bar to use dark text on light background
 * Dark mode is handled by useTheme hook directly
 */
export const useStatusBar = () => {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const configureStatusBar = async () => {
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        const isDark = document.documentElement.classList.contains('dark');
        if (isDark) {
          await StatusBar.setStyle({ style: Style.Dark });
          await StatusBar.setBackgroundColor({ color: '#212121' });
        } else {
          await StatusBar.setStyle({ style: Style.Light });
          await StatusBar.setBackgroundColor({ color: '#FFFFFF' });
        }
        await StatusBar.show();
      } catch (error) {
        console.warn('StatusBar configuration failed:', error);
      }
    };

    configureStatusBar();
  }, []);
};
