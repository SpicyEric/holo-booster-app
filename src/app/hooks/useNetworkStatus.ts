import { useState, useEffect } from 'react';
import { Network } from '@capacitor/network';
import { Capacitor } from '@capacitor/core';

/**
 * Cross-platform network status hook.
 * Uses @capacitor/network on native (more reliable than browser APIs)
 * and the standard online/offline events on web.
 */
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    let removeListener: (() => void) | null = null;
    let cancelled = false;

    if (Capacitor.isNativePlatform()) {
      Network.getStatus().then((status) => {
        if (!cancelled) setIsOnline(status.connected);
      });

      const handle = Network.addListener('networkStatusChange', (status) => {
        setIsOnline(status.connected);
      });

      removeListener = () => {
        // handle is a Promise<PluginListenerHandle> in newer versions
        Promise.resolve(handle).then((h) => h.remove?.());
      };
    } else {
      const onOnline = () => setIsOnline(true);
      const onOffline = () => setIsOnline(false);
      window.addEventListener('online', onOnline);
      window.addEventListener('offline', onOffline);
      removeListener = () => {
        window.removeEventListener('online', onOnline);
        window.removeEventListener('offline', onOffline);
      };
    }

    return () => {
      cancelled = true;
      removeListener?.();
    };
  }, []);

  return isOnline;
};
