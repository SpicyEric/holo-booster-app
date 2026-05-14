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

  const style: CSSProperties = {};
  if (state.version === 'v2' && state.color) {
    const hsl = hexToHslString(state.color);
    const fg = contrastForegroundHsl(state.color);
    Object.assign(style, {
      ['--primary' as string]: hsl,
      ['--primary-foreground' as string]: fg,
      ['--secondary' as string]: hsl,
      ['--secondary-foreground' as string]: fg,
      ['--accent' as string]: hsl,
      ['--ring' as string]: hsl,
      ['--gradient-primary' as string]: `linear-gradient(135deg, hsl(${hsl}), hsl(${brandDarkHsl(state.color)}))`,
      ['--gradient-glow' as string]: `linear-gradient(135deg, hsl(${hsl} / 0.12), hsl(${brandTintHsl(state.color, 92)} / 0.5))`,
      ['--shadow-glow' as string]: `0 4px 20px hsl(${hsl} / 0.18)`,
      ['--merchant-bg' as string]: brandTintHsl(state.color, 96),
      ['--merchant-bg-soft' as string]: brandTintHsl(state.color, 98),
      ['--merchant-sidebar' as string]: brandDarkHsl(state.color),
      ['--merchant-shadow' as string]: hsl,
    });
  }

  return (
    <div style={style} className="contents">
      {children}
    </div>
  );
}

export default MerchantBrandTheme;
