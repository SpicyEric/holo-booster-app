import { useEffect, useState, ReactNode, CSSProperties } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { hexToHslString, contrastForegroundHsl } from '@/lib/colorUtils';
import { isDemoMerchantActive, getDemoMerchantCustomerId } from '@/lib/demoMerchant';

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
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
      if (cancelled || !data) return;
      setState({
        version: (data.version as string) === 'v2' ? 'v2' : 'v1',
        color: (data.brand_color as string) || null,
      });
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

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
    });
  }

  return (
    <div style={style} className="contents">
      {children}
    </div>
  );
}

export default MerchantBrandTheme;
