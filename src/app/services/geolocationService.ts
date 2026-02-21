import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

export interface LocationResult {
  latitude: number;
  longitude: number;
}

export interface GeolocationError {
  code: string;
  message: string;
}

// Helper: race a promise against a timeout
function withTimeout<T>(promise: Promise<T>, ms: number, fallbackOrError: T | Error): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve, reject) => setTimeout(() => {
      console.warn('[Geolocation] Operation timed out after', ms, 'ms');
      if (fallbackOrError instanceof Error) {
        reject(fallbackOrError);
      } else {
        resolve(fallbackOrError);
      }
    }, ms)),
  ]);
}

/**
 * Open app settings so user can enable location permission
 */
export async function openAppSettings(): Promise<void> {
  const isNative = Capacitor.isNativePlatform();
  
  if (!isNative) {
    console.log('Cannot open app settings on web');
    return;
  }
  
  try {
    const { NativeSettings, AndroidSettings, IOSSettings } = await import('capacitor-native-settings');
    
    if (Capacitor.getPlatform() === 'android') {
      await NativeSettings.open({
        optionAndroid: AndroidSettings.ApplicationDetails,
        optionIOS: IOSSettings.App,
      });
    } else if (Capacitor.getPlatform() === 'ios') {
      await NativeSettings.open({
        optionAndroid: AndroidSettings.ApplicationDetails,
        optionIOS: IOSSettings.App,
      });
    }
  } catch (error) {
    console.error('Error opening app settings:', error);
  }
}

/**
 * Request location permissions - triggers native OS popup
 */
export async function requestLocationPermission(): Promise<{ location: string }> {
  const isNative = Capacitor.isNativePlatform();
  
  if (!isNative) {
    if ('geolocation' in navigator) {
      return { location: 'granted' };
    }
    return { location: 'denied' };
  }
  
  try {
    console.log('[Geolocation] Requesting permission via Capacitor...');
    const permission = await withTimeout(
      Geolocation.requestPermissions(),
      8000,
      { location: 'prompt', coarseLocation: 'prompt' } as any
    );
    console.log('[Geolocation] Permission result:', permission);
    return permission;
  } catch (error) {
    console.error('[Geolocation] Error requesting permission:', error);
    // Don't throw - return prompt so app continues
    return { location: 'prompt' };
  }
}

/**
 * Check current location permission status
 */
export async function checkLocationPermission(): Promise<{ location: string }> {
  const isNative = Capacitor.isNativePlatform();
  
  if (!isNative) {
    if ('geolocation' in navigator) {
      return { location: 'prompt' };
    }
    return { location: 'denied' };
  }
  
  try {
    const permission = await withTimeout(
      Geolocation.checkPermissions(),
      5000,
      { location: 'prompt', coarseLocation: 'prompt' } as any
    );
    console.log('[Geolocation] Current permission:', permission);
    return permission;
  } catch (error) {
    console.error('[Geolocation] Error checking permission:', error);
    return { location: 'prompt' };
  }
}

/**
 * Get current user location
 */
export async function getCurrentLocation(): Promise<LocationResult> {
  const isNative = Capacitor.isNativePlatform();
  console.log('[Geolocation] Getting location, isNative:', isNative);

  try {
    if (!isNative) {
      return new Promise((resolve, reject) => {
        if (!('geolocation' in navigator)) {
          reject({ code: 'POSITION_UNAVAILABLE', message: 'Geolocation wird nicht unterstützt' });
          return;
        }
        
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude });
          },
          (error) => {
            if (error.code === 1) {
              reject({ code: 'PERMISSION_DENIED', message: 'Bitte erlaube den Zugriff auf deinen Standort' });
            } else if (error.code === 2) {
              reject({ code: 'POSITION_UNAVAILABLE', message: 'Standort konnte nicht ermittelt werden' });
            } else {
              reject({ code: 'TIMEOUT', message: 'Standortabfrage hat zu lange gedauert' });
            }
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
      });
    }

    // Native: First check/request permission (this triggers the native OS popup)
    console.log('[Geolocation] Checking permission...');
    const permStatus = await withTimeout(
      Geolocation.checkPermissions(),
      5000,
      { location: 'prompt', coarseLocation: 'prompt' } as any
    );
    console.log('[Geolocation] Permission status:', permStatus);
    
    if (permStatus.location !== 'granted') {
      console.log('[Geolocation] Requesting permission (native popup)...');
      const newPermission = await withTimeout(
        Geolocation.requestPermissions(),
        10000,
        new Error('Permission request timed out')
      );
      console.log('[Geolocation] New permission status:', newPermission);
      
      if (newPermission.location !== 'granted') {
        throw { code: 'PERMISSION_DENIED', message: 'Standortberechtigung wurde verweigert' };
      }
    }

    // Get the actual position
    console.log('[Geolocation] Getting position...');
    const position = await withTimeout(
      Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }),
      15000,
      new Error('Position request timed out')
    );

    console.log('[Geolocation] Got position:', position.coords.latitude, position.coords.longitude);

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude
    };
  } catch (error: any) {
    console.error('[Geolocation] Error:', error);
    
    if (error.message?.includes('not implemented') || error.code === 'UNIMPLEMENTED') {
      throw { code: 'PLUGIN_NOT_AVAILABLE', message: 'Standort-Plugin ist nicht verfügbar.' };
    }
    
    if (error.code === 1 || error.code === 'PERMISSION_DENIED') {
      throw { code: 'PERMISSION_DENIED', message: 'Bitte erlaube den Zugriff auf deinen Standort in den Einstellungen' };
    } else if (error.code === 2 || error.code === 'POSITION_UNAVAILABLE') {
      throw { code: 'POSITION_UNAVAILABLE', message: 'Standort konnte nicht ermittelt werden' };
    } else if (error.code === 3 || error.code === 'TIMEOUT') {
      throw { code: 'TIMEOUT', message: 'Standortabfrage hat zu lange gedauert' };
    }
    
    throw { code: error.code || 'UNKNOWN', message: error.message || 'Unbekannter Fehler bei der Standortermittlung' };
  }
}

/**
 * Watch user location for real-time updates
 */
export async function watchLocation(
  callback: (location: LocationResult) => void,
  errorCallback?: (error: GeolocationError) => void
): Promise<string> {
  const watchId = await Geolocation.watchPosition(
    { enableHighAccuracy: true },
    (position: any, err: any) => {
      if (err) {
        console.error('Watch position error:', err);
        errorCallback?.({ code: 'WATCH_ERROR', message: err.message });
        return;
      }
      if (position) {
        callback({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      }
    }
  );
  return watchId;
}

/**
 * Stop watching location
 */
export async function clearLocationWatch(watchId: string): Promise<void> {
  try {
    await Geolocation.clearWatch({ id: watchId });
  } catch (error) {
    console.error('Error clearing location watch:', error);
  }
}