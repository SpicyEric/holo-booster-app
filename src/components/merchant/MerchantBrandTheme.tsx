import { useCallback, useEffect, useLayoutEffect, useState, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { hexToHslString, contrastForegroundHsl, brandTintHsl, brandDarkHsl } from '@/lib/colorUtils';
import { isDemoMerchantActive, getDemoMerchantCustomerId } from '@/lib/demoMerchant';
import { BRAND_UPDATED_EVENT } from '@/hooks/useMerchantBrand';

/**
 * Wrappt Inhalte des Merchant-Backoffice und überschreibt für V2-Händler
 * die Eloyo-Lila-Tokens (`--primary`, `--ring`, `--secondary`, `--accent`)
 * mit der individuellen Markenfarbe aus `customers.brand_color`.
 *
 * V1-Händler bleiben unverändert (kein Override).
 *
 * Anti-Flackern: Letzte bekannte Markenfarbe wird in localStorage gecached und
 * synchron via useLayoutEffect angewendet, BEVOR der erste Frame paint-et.
 */

interface BrandState {
  version: 'v1' | 'v2';
  color: string | null;
}

const CACHE_KEY = 'eloyo-merchant-brand-cache';

function readCache(): BrandState {
  if (typeof window === 'undefined') return { version: 'v1', color: null };
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return { version: 'v1', color: null };
    const parsed = JSON.parse(raw);
    return {
      version: parsed.version === 'v2' ? 'v2' : 'v1',
      color: typeof parsed.color === 'string' ? parsed.color : null,
    };
  } catch {
    return { version: 'v1', color: null };
  }
}

function writeCache(state: BrandState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(state));
  } catch {}
}

const BRAND_KEYS = [
  '--primary',
  '--primary-foreground',
  '--secondary',
  '--secondary-foreground',
  '--accent',
  '--ring',
  '--gradient-primary',
  '--gradient-glow',
  '--shadow-glow',
  '--merchant-bg',
  '--merchant-bg-soft',
  '--merchant-sidebar',
  '--merchant-shadow',
];

function applyBrand(state: BrandState) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (state.version === 'v2' && state.color) {
    const hsl = hexToHslString(state.color);
    const fg = contrastForegroundHsl(state.color);
    const map: Record<string, string> = {
      '--primary': hsl,
      '--primary-foreground': fg,
      '--secondary': hsl,
      '--secondary-foreground': fg,
      '--accent': hsl,
      '--ring': hsl,
      '--gradient-primary': `linear-gradient(135deg, hsl(${hsl}), hsl(${brandDarkHsl(state.color)}))`,
      '--gradient-glow': `linear-gradient(135deg, hsl(${hsl} / 0.12), hsl(${brandTintHsl(state.color, 92)} / 0.5))`,
      '--shadow-glow': `0 4px 20px hsl(${hsl} / 0.18)`,
      '--merchant-bg': brandTintHsl(state.color, 96),
      '--merchant-bg-soft': brandTintHsl(state.color, 98),
      '--merchant-sidebar': brandDarkHsl(state.color),
      '--merchant-shadow': hsl,
    };
    BRAND_KEYS.forEach((k) => root.style.setProperty(k, map[k]));
  } else {
    BRAND_KEYS.forEach((k) => root.style.removeProperty(k));
  }
}

export function MerchantBrandTheme({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  // Initialwert synchron aus Cache lesen → kein Lila-Flackern beim Mount.
  const [state, setState] = useState<BrandState>(() => readCache());

  // Synchron vor dem ersten Paint anwenden.
  useLayoutEffect(() => {
    applyBrand(state);
  }, [state.version, state.color]);

  const fetchBrand = useCallback(async (cancelledRef?: { current: boolean }) => {
    let customerId: string | null = null;
    if (isDemoMerchantActive()) {
      customerId = getDemoMerchantCustomerId();
    } else if (user?.id) {
      const { resolveMerchantCustomerId } = await import('@/lib/resolveMerchantCustomerId');
      customerId = await resolveMerchantCustomerId(user.id);
    }
    if (!customerId) return;
    try {
      const { DEMO_ONBOARDING_CUSTOMER_ID, isDemoOnboardingTourActive, getDemoOnboardingState } =
        await import('@/lib/demoOnboardingTour');
      if (customerId === DEMO_ONBOARDING_CUSTOMER_ID && isDemoOnboardingTourActive()) {
        const profile = getDemoOnboardingState().profile || {};
        if (cancelledRef?.current) return;
        const next: BrandState = { version: 'v2', color: (profile.brand_color as string) || null };
        setState(next);
        writeCache(next);
        return;
      }
    } catch {}
    const { data } = await supabase
      .from('customers')
      .select('version, brand_color')
      .eq('id', customerId)
      .maybeSingle();
    if (cancelledRef?.current || !data) return;
    const next: BrandState = {
      version: (data.version as string) === 'v2' ? 'v2' : 'v1',
      color: (data.brand_color as string) || null,
    };
    setState(next);
    writeCache(next);
  }, [user?.id]);

  useEffect(() => {
    const cancelledRef = { current: false };
    fetchBrand(cancelledRef);
    const onUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail as { brandColor?: string } | undefined;
      if (detail?.brandColor) {
        setState((prev) => {
          const next: BrandState = { version: 'v2', color: detail.brandColor! };
          writeCache(next);
          return next;
        });
      }
      fetchBrand(cancelledRef);
    };
    window.addEventListener(BRAND_UPDATED_EVENT, onUpdated);
    return () => {
      cancelledRef.current = true;
      window.removeEventListener(BRAND_UPDATED_EVENT, onUpdated);
    };
  }, [fetchBrand]);

  // Cleanup nur beim Verlassen des Merchant-Bereichs (Unmount des Wrappers).
  useEffect(() => {
    return () => {
      BRAND_KEYS.forEach((k) => document.documentElement.style.removeProperty(k));
    };
  }, []);

  return <>{children}</>;
}

export default MerchantBrandTheme;
