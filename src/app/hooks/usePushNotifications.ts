import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { pushNotificationService } from '@/app/services/pushNotificationService';
import { useAuth } from '@/hooks/useAuth';
import { checkLocationPermission, requestLocationPermission } from '@/app/services/geolocationService';

/**
 * Hook to initialize push notifications when the app loads.
 * Passes user ID so device token can be saved to backend.
 */
export const usePushNotifications = () => {
  const { user } = useAuth();
  const initializedForUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.id || initializedForUserRef.current === user.id) return;

    initializedForUserRef.current = user.id;
    let cancelled = false;

    const initializePermissions = async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          const locationStatus = await checkLocationPermission();

          if (!cancelled && locationStatus.location === 'prompt') {
            await requestLocationPermission();
          }
        }

        if (!cancelled) {
          await pushNotificationService.initialize(user.id);
        }
      } catch (error) {
        console.error('Error initializing app permissions:', error);
      }
    };

    void initializePermissions();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);
};
