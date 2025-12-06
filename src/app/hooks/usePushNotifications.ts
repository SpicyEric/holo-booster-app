import { useEffect } from 'react';
import { pushNotificationService } from '@/app/services/pushNotificationService';

/**
 * Hook to initialize push notifications when the app loads.
 * Should be used in the main app component or layout.
 */
export const usePushNotifications = () => {
  useEffect(() => {
    const initializePush = async () => {
      await pushNotificationService.initialize();
    };

    initializePush();
  }, []);
};
