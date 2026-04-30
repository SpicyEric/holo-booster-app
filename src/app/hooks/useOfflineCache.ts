import { useEffect, useRef, useState } from 'react';
import { persistentStorage } from '@/app/lib/preferencesStorage';

interface CacheEnvelope<T> {
  data: T;
  cachedAt: number;
}

interface UseOfflineCacheResult<T> {
  data: T | null;
  isStale: boolean;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const CACHE_PREFIX = 'eloyo_swr_';

/**
 * Stale-While-Revalidate cache backed by @capacitor/preferences.
 *
 * 1. Loads cached data immediately (data + isStale=true)
 * 2. Fetches fresh data in background and updates UI when ready
 * 3. Persists fresh data for next start
 * 4. After maxAgeMs the cache is considered expired and ignored
 */
export function useOfflineCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  maxAgeMs: number = 24 * 60 * 60 * 1000
): UseOfflineCacheResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const mountedRef = useRef(true);

  const cacheKey = `${CACHE_PREFIX}${key}`;

  const revalidate = async () => {
    try {
      const fresh = await fetcherRef.current();
      if (!mountedRef.current) return;
      setData(fresh);
      setIsStale(false);
      const envelope: CacheEnvelope<T> = { data: fresh, cachedAt: Date.now() };
      await persistentStorage.set(cacheKey, JSON.stringify(envelope));
    } catch (err) {
      console.warn(`[useOfflineCache] revalidate failed for ${key}:`, err);
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    (async () => {
      // 1. Hydrate from cache
      try {
        const raw = await persistentStorage.get(cacheKey);
        if (raw && !cancelled) {
          const parsed = JSON.parse(raw) as CacheEnvelope<T>;
          const age = Date.now() - parsed.cachedAt;
          if (age <= maxAgeMs) {
            setData(parsed.data);
            setIsStale(true);
          }
        }
      } catch {
        // ignore corrupt cache
      }

      // 2. Revalidate in background
      if (!cancelled) await revalidate();
    })();

    return () => {
      cancelled = true;
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, maxAgeMs]);

  return { data, isStale, isLoading, refresh: revalidate };
}
