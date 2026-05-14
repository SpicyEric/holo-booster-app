import { useEffect, useState } from 'react';
import { HexColorPicker, HexColorInput } from 'react-colorful';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Palette, Pipette, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { isDemoMerchantActive } from '@/lib/demoMerchant';
import { notifyMerchantBrandUpdated } from '@/hooks/useMerchantBrand';

const DEFAULT_COLOR = '#8B5CF6';

interface Props {
  customerId: string;
}

/**
 * Markenfarbe einstellen (V2-Händler). Color-Picker mit Live-Vorschau
 * eines Mini-Treuepasses. Wird nur eingeblendet, wenn der Händler auf
 * Version 'v2' steht.
 */
export function MerchantBrandColorCard({ customerId }: Props) {
  const [version, setVersion] = useState<string>('v1');
  const [color, setColor] = useState<string>(DEFAULT_COLOR);
  const [savedColor, setSavedColor] = useState<string>(DEFAULT_COLOR);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('customers')
        .select('version, brand_color')
        .eq('id', customerId)
        .maybeSingle();
      if (cancelled) return;
      const c = (data?.brand_color as string | null) || DEFAULT_COLOR;
      setVersion((data?.version as string) || 'v1');
      setColor(c);
      setSavedColor(c);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [customerId]);

  if (loading || version !== 'v2') return null;

  const dirty = color.toLowerCase() !== savedColor.toLowerCase();

  const save = async () => {
    if (isDemoMerchantActive()) {
      toast.info('Demo-Modus: Speichern ist hier deaktiviert.');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('customers')
      .update({ brand_color: color })
      .eq('id', customerId);
    setSaving(false);
    if (error) { toast.error('Konnte Farbe nicht speichern'); return; }
    setSavedColor(color);
    notifyMerchantBrandUpdated(customerId, color);
    toast.success('Markenfarbe gespeichert');
  };

  const reset = () => setColor(DEFAULT_COLOR);

  return (
    <Card className="rounded-2xl shadow-sm border-0 bg-white">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-lg font-semibold">
          <span
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: `${color}22` }}
          >
            <Palette className="h-5 w-5" style={{ color }} />
          </span>
          Markenfarbe
        </CardTitle>
        <CardDescription>
          Diese Farbe siehst du im Backoffice und deine Kunden auf ihrem Treuepass in der App.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-w-md">
          <div className="rounded-2xl overflow-hidden border border-border">
            <HexColorPicker
              color={color}
              onChange={setColor}
              style={{ width: '100%', height: 220 }}
            />
          </div>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl border border-border shrink-0"
              style={{ background: color }}
            />
            <div className="flex-1">
              <label className="text-xs text-muted-foreground block mb-1">HEX</label>
              <HexColorInput
                color={color}
                onChange={setColor}
                prefixed
                className="w-full px-3 py-2 rounded-lg border border-input bg-background font-mono text-sm uppercase focus:outline-none focus:ring-2"
                style={{ ['--tw-ring-color' as string]: color } as React.CSSProperties}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={save} disabled={!dirty || saving} className="flex-1" style={{ background: color, color: 'white' }}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Speichern
            </Button>
            <Button onClick={reset} variant="outline" disabled={color === DEFAULT_COLOR}>
              Standard
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Live-Vorschau siehst du rechts in der Handy-Vorschau.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default MerchantBrandColorCard;
