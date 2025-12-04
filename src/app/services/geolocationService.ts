import { Geolocation, PermissionStatus } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

export interface LocationResult {
  latitude: number;
  longitude: number;
}

export interface GeolocationError {
  code: string;
  message: string;
}

/**
 * Request location permissions - required for native apps
 */
export async function requestLocationPermission(): Promise<PermissionStatus> {
  try {
    const permission = await Geolocation.requestPermissions();
    console.log('Location permission result:', permission);
    return permission;
  } catch (error) {
    console.error('Error requesting location permission:', error);
    throw error;
  }
}

/**
 * Check current location permission status
 */
export async function checkLocationPermission(): Promise<PermissionStatus> {
  try {
    const permission = await Geolocation.checkPermissions();
    console.log('Current location permission:', permission);
    return permission;
  } catch (error) {
    console.error('Error checking location permission:', error);
    throw error;
  }
}

/**
 * Get current user location
 * Works on both web and native (iOS/Android) via Capacitor
 */
export async function getCurrentLocation(): Promise<LocationResult> {
  const isNative = Capacitor.isNativePlatform();
  console.log('Getting location, isNative:', isNative);

  try {
    // On native platforms, ensure we have permission first
    if (isNative) {
      const permStatus = await Geolocation.checkPermissions();
      console.log('Permission status:', permStatus);
      
      if (permStatus.location !== 'granted') {
        console.log('Requesting location permission...');
        const newPermission = await Geolocation.requestPermissions();
        console.log('New permission status:', newPermission);
        
        if (newPermission.location !== 'granted') {
          throw { 
            code: 'PERMISSION_DENIED', 
            message: 'Standortberechtigung wurde verweigert' 
          };
        }
      }
    }

    // Get the actual position
    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000 // Cache for 1 minute
    });

    console.log('Got position:', position.coords.latitude, position.coords.longitude);

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude
    };
  } catch (error: any) {
    console.error('Geolocation error:', error);
    
    // Provide meaningful error messages
    if (error.code === 1 || error.code === 'PERMISSION_DENIED') {
      throw { 
        code: 'PERMISSION_DENIED', 
        message: 'Bitte erlaube den Zugriff auf deinen Standort in den Einstellungen' 
      };
    } else if (error.code === 2) {
      throw { 
        code: 'POSITION_UNAVAILABLE', 
        message: 'Standort konnte nicht ermittelt werden' 
      };
    } else if (error.code === 3) {
      throw { 
        code: 'TIMEOUT', 
        message: 'Standortabfrage hat zu lange gedauert' 
      };
    }
    
    throw { 
      code: 'UNKNOWN', 
      message: error.message || 'Unbekannter Fehler bei der Standortermittlung' 
    };
  }
}

/**
 * Watch user location for real-time updates
 */
export async function watchLocation(
  callback: (location: LocationResult) => void,
  errorCallback?: (error: GeolocationError) => void
): Promise<string> {
  try {
    const watchId = await Geolocation.watchPosition(
      { enableHighAccuracy: true },
      (position, err) => {
        if (err) {
          console.error('Watch position error:', err);
          errorCallback?.({ code: 'WATCH_ERROR', message: err.message });
          return;
        }
        
        if (position) {
          callback({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        }
      }
    );
    
    return watchId;
  } catch (error: any) {
    console.error('Error starting location watch:', error);
    throw error;
  }
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
