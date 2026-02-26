import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface GoogleMapsApiKeyState {
  apiKey: string | null;
  loading: boolean;
  error: string | null;
}

const ENV_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

export function useGoogleMapsApiKey(): GoogleMapsApiKeyState {
  const [apiKey, setApiKey] = useState<string | null>(ENV_KEY?.trim() || null);
  const [loading, setLoading] = useState<boolean>(!ENV_KEY?.trim());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ENV_KEY?.trim()) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadKey = async () => {
      try {
        const { data, error: invokeError } = await supabase.functions.invoke('get-google-maps-api-key');

        if (invokeError) {
          throw invokeError;
        }

        const resolvedKey = typeof data?.apiKey === 'string' ? data.apiKey.trim() : '';
        if (!resolvedKey) {
          throw new Error('GOOGLE_MAPS_API_KEY_MISSING');
        }

        if (isMounted) {
          setApiKey(resolvedKey);
          setError(null);
        }
      } catch (err) {
        console.error('[GoogleMaps] Failed to resolve API key:', err);
        if (isMounted) {
          setError('Google Maps API Key fehlt oder ist ungültig.');
          setApiKey(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadKey();

    return () => {
      isMounted = false;
    };
  }, []);

  return { apiKey, loading, error };
}
