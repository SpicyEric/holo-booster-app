import { useEffect } from 'react';
import { Network } from '@capacitor/network';
import { Capacitor } from '@capacitor/core';
import { offlineScanQueue } from '@/app/lib/offlineScanQueue';

/**
 * Mounts once at the app root. Whenever connectivity is restored
 * (or on cold start) it triggers processing of the offline scan queue.
 * Server-side validation is always enforced — this only replays scans.
 */
export const OfflineScanQueueProcessor = () => {
  useEffect(() => {
    let removeListener: (() => void) | null = null;

    // Process on mount (covers cold start scenario)
    void offlineScanQueue.processQueue();

    if (Capacitor.isNativePlatform()) {
      const handle = Network.addListener('networkStatusChange', (status) => {
        if (status.connected) {
          void offlineScanQueue.processQueue();
        }
      });
      removeListener = () => {
        Promise.resolve(handle).then((h) => h.remove?.());
      };
    } else {
      const onOnline = () => {
        void offlineScanQueue.processQueue();
      };
      window.addEventListener('online', onOnline);
      removeListener = () => window.removeEventListener('online', onOnline);
    }

    return () => {
      removeListener?.();
    };
  }, []);

  return null;
};
