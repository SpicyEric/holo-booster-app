import { useCallback, useEffect, useState, ReactNode, CSSProperties } from 'react';
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
 */

interface BrandState {
  version: 'v1' | 'v2';
  color: string | null;
}

export function MerchantBrandTheme({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<BrandState>({ version: 'v1', color: null });

  const fetchBrand = useCallback(async (cancelledRef?: { current: boolean }) => {
    let customerId: string | null = null;
    if (isDemoMerchantActive()) {
      customerId = getDemoMerchantCustomerId();
    } else if (user?.id) {
      const { resolveMerchantCustomerId } = await import('@/lib/resolveMerchantCustomerId');
      customerId = await resolveMerchantCustomerId(user.id);
    }
    if (!customerId) return;
    const { data } = await supabase
      .from('customers')
      .select('version, brand_color')
      .eq('id', customerId)
      .maybeSingle();
    if (cancelledRef?.current || !data) return;
    setState({
      version: (data.version as string) === 'v2' ? 'v2' : 'v1',
      color: (data.brand_color as string) || null,
    });
  }, [user?.id]);

  useEffect(() => {
    const cancelledRef = { current: false };
    fetchBrand(cancelledRef);
    const onUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail as { brandColor?: string } | undefined;
      if (detail?.brandColor) {
        setState((prev) => ({ ...prev, version: 'v2', color: detail.brandColor! }));
      }
      fetchBrand(cancelledRef);
    };
    window.addEventListener(BRAND_UPDATED_EVENT, onUpdated);
    return () => {
      cancelledRef.current = true;
      window.removeEventListener(BRAND_UPDATED_EVENT, onUpdated);
    };
  }, [fetchBrand]);

  // Apply brand variables to <html> so they also reach Radix portals (Dialog/Toast/Popover)
  useEffect(() => {
    const root = document.documentElement;
    const keys = [
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
      keys.forEach((k) => root.style.setProperty(k, map[k]));
    }
    return () => {
      // Reset on unmount so non-merchant routes get default tokens back
      keys.forEach((k) => root.style.removeProperty(k));
    };
  }, [state.version, state.color]);

  return <>{children}</>;
}

export default MerchantBrandTheme;
