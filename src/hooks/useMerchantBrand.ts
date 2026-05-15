import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MerchantBrand {
  version: 'v1' | 'v2';
  color: string;       // primary brand color (HEX)
  soft: string;        // softer companion (HEX-ish via rgba fallback)
  loading: boolean;
}

const DEFAULT_COLOR = '#8B5CF6'; // Eloyo Lila
export const BRAND_UPDATED_EVENT = 'merchant-brand-updated';

/**
 * Broadcast a brand-update so all mounted hook instances re-fetch.
 * Call this after persisting `version` or `brand_color` for a merchant.
 */
export function notifyMerchantBrandUpdated(merchantCustomerId: string, brandColor?: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(BRAND_UPDATED_EVENT, { detail: { merchantCustomerId, brandColor } }),
  );
}

export function useMerchantBrand(merchantCustomerId?: string | null): MerchantBrand {
  const [state, setState] = useState<MerchantBrand>({
    version: 'v1',
    color: DEFAULT_COLOR,
    soft: DEFAULT_COLOR,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    if (!merchantCustomerId) {
      setState({ version: 'v1', color: DEFAULT_COLOR, soft: DEFAULT_COLOR, loading: false });
      return;
    }

    const fetchBrand = async () => {
      // Demo-Onboarding-Tour: kein DB-Eintrag vorhanden → Werte aus dem
      // localStorage-State der Tour lesen (immer V2).
      try {
        const { DEMO_ONBOARDING_CUSTOMER_ID, isDemoOnboardingTourActive, getDemoOnboardingState } =
          await import('@/lib/demoOnboardingTour');
        if (
          merchantCustomerId === DEMO_ONBOARDING_CUSTOMER_ID &&
          isDemoOnboardingTourActive()
        ) {
          const profile = getDemoOnboardingState().profile || {};
          if (cancelled) return;
          const c = (profile.brand_color as string) || DEFAULT_COLOR;
          setState({ version: 'v2', color: c, soft: c, loading: false });
          return;
        }
      } catch {}

      const { data } = await supabase
        .from('customers')
        .select('version, brand_color')
        .eq('id', merchantCustomerId)
        .maybeSingle();
      if (cancelled) return;
      const color = (data?.brand_color as string | null) || DEFAULT_COLOR;
      setState({
        version: ((data?.version as string) === 'v2' ? 'v2' : 'v1'),
        color,
        soft: color,
        loading: false,
      });
    };

    fetchBrand();

    const onUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail as { merchantCustomerId?: string; brandColor?: string } | undefined;
      if (!detail?.merchantCustomerId || detail.merchantCustomerId === merchantCustomerId) {
        if (detail?.brandColor) {
          setState((prev) => ({ ...prev, color: detail.brandColor!, soft: detail.brandColor!, loading: false }));
        }
        fetchBrand();
      }
    };
    window.addEventListener(BRAND_UPDATED_EVENT, onUpdated);

    return () => {
      cancelled = true;
      window.removeEventListener(BRAND_UPDATED_EVENT, onUpdated);
    };
  }, [merchantCustomerId]);

  return state;
}
