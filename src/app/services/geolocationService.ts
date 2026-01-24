import { Capacitor } from '@capacitor/core';

export interface LocationResult {
  latitude: number;
  longitude: number;
}

export interface GeolocationError {
  code: string;
  message: string;
}

// Dynamically import Geolocation to avoid plugin registration issues
let GeolocationPlugin: any = null;

async function getGeolocationPlugin() {
  if (GeolocationPlugin) return GeolocationPlugin;
  
  try {
    const module = await import('@capacitor/geolocation');
    GeolocationPlugin = module.Geolocation;
    return GeolocationPlugin;
  } catch (error) {
    console.error('Failed to load Geolocation plugin:', error);
    return null;
  }
}

/**
 * Request location permissions - required for native apps
 */
export async function requestLocationPermission(): Promise<{ location: string }> {
  const isNative = Capacitor.isNativePlatform();
  
  if (!isNative) {
    // Web: Check if geolocation is available
    if ('geolocation' in navigator) {
      return { location: 'granted' };
    }
    return { location: 'denied' };
  }
  
  try {
    const Geolocation = await getGeolocationPlugin();
    if (!Geolocation) {
      throw new Error('Geolocation plugin not available');
    }
    
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
export async function checkLocationPermission(): Promise<{ location: string }> {
  const isNative = Capacitor.isNativePlatform();
  
  if (!isNative) {
    // Web doesn't need explicit permission check
    if ('geolocation' in navigator) {
      return { location: 'prompt' };
    }
    return { location: 'denied' };
  }
  
  try {
    const Geolocation = await getGeolocationPlugin();
    if (!Geolocation) {
      throw new Error('Geolocation plugin not available');
    }
    
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
    // On web, use browser geolocation API directly
    if (!isNative) {
      return new Promise((resolve, reject) => {
        if (!('geolocation' in navigator)) {
          reject({ 
            code: 'POSITION_UNAVAILABLE', 
            message: 'Geolocation wird nicht unterstützt' 
          });
          return;
        }
        
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          },
          (error) => {
            if (error.code === 1) {
              reject({ 
                code: 'PERMISSION_DENIED', 
                message: 'Bitte erlaube den Zugriff auf deinen Standort' 
              });
            } else if (error.code === 2) {
              reject({ 
                code: 'POSITION_UNAVAILABLE', 
                message: 'Standort konnte nicht ermittelt werden' 
              });
            } else {
              reject({ 
                code: 'TIMEOUT', 
                message: 'Standortabfrage hat zu lange gedauert' 
              });
            }
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
      });
    }

    // Native: Use Capacitor plugin
    const Geolocation = await getGeolocationPlugin();
    if (!Geolocation) {
      throw { 
        code: 'PLUGIN_NOT_AVAILABLE', 
        message: 'Standort-Plugin ist nicht verfügbar. Bitte App neu installieren.' 
      };
    }

    // Ensure we have permission first
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
    
    // Check for plugin not implemented error
    if (error.message?.includes('not implemented') || error.code === 'UNIMPLEMENTED') {
      throw { 
        code: 'PLUGIN_NOT_AVAILABLE', 
        message: 'Standort-Plugin ist nicht verfügbar. Bitte führe "npx cap sync" aus und baue die App neu.' 
      };
    }
    
    // Provide meaningful error messages
    if (error.code === 1 || error.code === 'PERMISSION_DENIED') {
      throw { 
        code: 'PERMISSION_DENIED', 
        message: 'Bitte erlaube den Zugriff auf deinen Standort in den Einstellungen' 
      };
    } else if (error.code === 2 || error.code === 'POSITION_UNAVAILABLE') {
      throw { 
        code: 'POSITION_UNAVAILABLE', 
        message: 'Standort konnte nicht ermittelt werden' 
      };
    } else if (error.code === 3 || error.code === 'TIMEOUT') {
      throw { 
        code: 'TIMEOUT', 
        message: 'Standortabfrage hat zu lange gedauert' 
      };
    }
    
    throw { 
      code: error.code || 'UNKNOWN', 
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
    const Geolocation = await getGeolocationPlugin();
    if (!Geolocation) {
      throw new Error('Geolocation plugin not available');
    }
    
    const watchId = await Geolocation.watchPosition(
      { enableHighAccuracy: true },
      (position: any, err: any) => {
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
    const Geolocation = await getGeolocationPlugin();
    if (!Geolocation) return;
    
    await Geolocation.clearWatch({ id: watchId });
  } catch (error) {
    console.error('Error clearing location watch:', error);
  }
}
