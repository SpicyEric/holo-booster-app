import { useEffect } from 'react';
import { pushNotificationService } from '@/app/services/pushNotificationService';
import { useAuth } from '@/hooks/useAuth';

/**
 * Hook to initialize push notifications when the app loads.
 * Passes user ID so device token can be saved to backend.
 */
export const usePushNotifications = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    const initializePush = async () => {
      await pushNotificationService.initialize(user.id);
    };

    initializePush();
  }, [user?.id]);
};
