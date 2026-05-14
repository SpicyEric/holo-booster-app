import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MerchantBrand {
  version: 'v1' | 'v2';
  color: string;       // primary brand color (HEX)
  soft: string;        // softer companion (HEX-ish via rgba fallback)
  loading: boolean;
}

const DEFAULT_COLOR = '#8B5CF6'; // Eloyo Lila

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
    (async () => {
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
    })();
    return () => { cancelled = true; };
  }, [merchantCustomerId]);

  return state;
}
