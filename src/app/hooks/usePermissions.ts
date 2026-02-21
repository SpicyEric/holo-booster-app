import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { nfcService } from '@/app/services/nfcService';
import { checkLocationPermission, requestLocationPermission, openAppSettings } from '@/app/services/geolocationService';

export interface PermissionState {
  location: 'unknown' | 'granted' | 'denied' | 'prompt';
  nfc: 'unknown' | 'supported' | 'unsupported' | 'disabled';
}

export interface PermissionActions {
  requestLocation: () => Promise<boolean>;
  checkNfc: () => Promise<boolean>;
  openNfcSettings: () => Promise<void>;
  openLocationSettings: () => Promise<void>;
  checkAllPermissions: () => Promise<PermissionState>;
}

export function usePermissions() {
  const [permissions, setPermissions] = useState<PermissionState>({
    location: 'unknown',
    nfc: 'unknown',
  });
  const [isLoading, setIsLoading] = useState(true);
  const isNative = Capacitor.isNativePlatform();

  const checkLocationPermissionStatus = useCallback(async (): Promise<'granted' | 'denied' | 'prompt'> => {
    if (!isNative) return 'granted'; // Web doesn't need explicit permission check
    
    try {
      const status = await checkLocationPermission();
      console.log('Location permission status:', status);
      
      if (status.location === 'granted') return 'granted';
      if (status.location === 'denied') return 'denied';
      return 'prompt';
    } catch (error) {
      console.error('Error checking location permission:', error);
      return 'prompt';
    }
  }, [isNative]);

  const requestLocationPermissionAction = useCallback(async (): Promise<boolean> => {
    if (!isNative) {
      setPermissions(prev => ({ ...prev, location: 'granted' }));
      return true;
    }

    try {
      console.log('Requesting location permission...');
      const result = await requestLocationPermission();
      console.log('Location permission result:', result);
      
      const granted = result.location === 'granted';
      setPermissions(prev => ({ ...prev, location: granted ? 'granted' : 'denied' }));
      return granted;
    } catch (error) {
      console.error('Error requesting location permission:', error);
      setPermissions(prev => ({ ...prev, location: 'denied' }));
      return false;
    }
  }, [isNative]);

  const openLocationSettings = useCallback(async () => {
    try {
      await openAppSettings();
    } catch (error) {
      console.error('Error opening app settings:', error);
    }
  }, []);

  const checkNfcStatus = useCallback(async (): Promise<'supported' | 'unsupported' | 'disabled'> => {
    try {
      const isSupported = await nfcService.isSupported();
      if (!isSupported) return 'unsupported';
      
      // On Android, check if NFC is enabled
      if (Capacitor.getPlatform() === 'android') {
        const isEnabled = await nfcService.isEnabled();
        return isEnabled ? 'supported' : 'disabled';
      }
      
      return 'supported';
    } catch (error) {
      console.error('Error checking NFC status:', error);
      return 'unsupported';
    }
  }, []);

  const openNfcSettings = useCallback(async () => {
    try {
      await nfcService.openSettings();
    } catch (error) {
      console.error('Error opening NFC settings:', error);
    }
  }, []);

  const checkAllPermissions = useCallback(async (): Promise<PermissionState> => {
    setIsLoading(true);
    
    // Add timeout to prevent hanging forever on native
    const withTimeout = <T,>(promise: Promise<T>, fallback: T, ms = 5000): Promise<T> => {
      return Promise.race([
        promise,
        new Promise<T>((resolve) => setTimeout(() => {
          console.warn('[usePermissions] Permission check timed out, using fallback');
          resolve(fallback);
        }, ms)),
      ]);
    };
    
    const [locationStatus, nfcStatus] = await Promise.all([
      withTimeout(checkLocationPermissionStatus(), 'prompt' as const),
      withTimeout(checkNfcStatus(), 'unsupported' as const),
    ]);
    
    const newState: PermissionState = {
      location: locationStatus,
      nfc: nfcStatus,
    };
    
    console.log('[usePermissions] Check complete:', newState);
    setPermissions(newState);
    setIsLoading(false);
    
    return newState;
  }, [checkLocationPermissionStatus, checkNfcStatus]);

  // Initial check on mount
  useEffect(() => {
    checkAllPermissions();
  }, [checkAllPermissions]);

  return {
    permissions,
    isLoading,
    isNative,
    requestLocation: requestLocationPermissionAction,
    checkNfc: async () => {
      const status = await checkNfcStatus();
      setPermissions(prev => ({ ...prev, nfc: status }));
      return status === 'supported';
    },
    openNfcSettings,
    openLocationSettings,
    checkAllPermissions,
  };
}
