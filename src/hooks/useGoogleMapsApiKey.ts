import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface GoogleMapsApiKeyState {
  apiKey: string | null;
  loading: boolean;
  error: string | null;
}

const ENV_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
const CACHE_KEY = 'gmaps_api_key';
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

function getCachedKey(): string | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { key, ts } = JSON.parse(raw);
    if (Date.now() - ts < CACHE_TTL && typeof key === 'string' && key.length > 0) {
      return key;
    }
    sessionStorage.removeItem(CACHE_KEY);
  } catch {}
  return null;
}

function setCachedKey(key: string) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ key, ts: Date.now() }));
  } catch {}
}

export function useGoogleMapsApiKey(): GoogleMapsApiKeyState {
  const envKey = ENV_KEY?.trim() || null;
  const cached = !envKey ? getCachedKey() : null;
  const initialKey = envKey || cached;

  const [apiKey, setApiKey] = useState<string | null>(initialKey);
  const [loading, setLoading] = useState<boolean>(!initialKey);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialKey) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout

    const loadKey = async () => {
      try {
        const { data, error: invokeError } = await supabase.functions.invoke('get-google-maps-api-key');

        if (invokeError) throw invokeError;

        const resolvedKey = typeof data?.apiKey === 'string' ? data.apiKey.trim() : '';
        if (!resolvedKey) throw new Error('GOOGLE_MAPS_API_KEY_MISSING');

        if (isMounted) {
          setCachedKey(resolvedKey);
          setApiKey(resolvedKey);
          setError(null);
        }
      } catch (err) {
        console.error('[GoogleMaps] Failed to resolve API key:', err);
        if (isMounted) {
          setError('Google Maps konnte nicht geladen werden. Bitte versuche es erneut.');
          setApiKey(null);
        }
      } finally {
        clearTimeout(timeout);
        if (isMounted) setLoading(false);
      }
    };

    loadKey();

    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [initialKey]);

  return { apiKey, loading, error };
}
