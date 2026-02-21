import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

/**
 * Configure the native status bar to use dark text on light background
 */
export const useStatusBar = () => {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const configureStatusBar = async () => {
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        // Dark text on light background
        await StatusBar.setStyle({ style: Style.Light });
        // Set background color to white to match app
        await StatusBar.setBackgroundColor({ color: '#FFFFFF' });
        // Make sure it's visible
        await StatusBar.show();
      } catch (error) {
        console.warn('StatusBar configuration failed:', error);
      }
    };

    configureStatusBar();
  }, []);
};
