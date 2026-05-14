import { useEffect, useState } from 'react';
import { HexColorPicker, HexColorInput } from 'react-colorful';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Palette, Save } from 'lucide-react';
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
    notifyMerchantBrandUpdated(customerId);
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Picker */}
          <div className="space-y-4">
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
          </div>

          {/* Live-Vorschau */}
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              Vorschau Treuepass
            </p>
            <div className="rounded-3xl border-8 border-neutral-900 bg-[#faf8f5] overflow-hidden shadow-xl mx-auto" style={{ maxWidth: 280 }}>
              <MiniTreuepassPreview color={color} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* --------- Mini-Vorschau --------- */
function MiniTreuepassPreview({ color }: { color: string }) {
  const soft = `${color}22`;
  return (
    <div className="p-3 space-y-3">
      {/* Mini-Header */}
      <div className="flex items-center gap-2 pb-2 border-b" style={{ borderColor: `${color}22` }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm" style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}>🥐</div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-neutral-900 truncate">Dein Geschäft</p>
          <p className="text-[10px] font-medium" style={{ color }}>Dein Treuepass</p>
        </div>
      </div>

      {/* Header-Zähler */}
      <div>
        <p className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: `${color}cc` }}>Check-ins</p>
        <p className="text-2xl font-extrabold text-neutral-900 leading-none">4</p>
      </div>

      {/* Mini-Snake */}
      <svg width="100%" height="80" viewBox="0 0 260 80">
        <path
          d="M 20 40 Q 60 10, 90 40 Q 120 70, 150 40 Q 180 10, 210 40"
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeLinecap="round"
        />
        <path
          d="M 210 40 Q 230 55, 250 40"
          fill="none"
          stroke={color}
          strokeOpacity={0.2}
          strokeWidth={6}
          strokeLinecap="round"
        />
        {/* Vergangener Knoten mit Haken */}
        <circle cx="20" cy="40" r="13" fill={color} />
        <path d="M 14 40 l 4 4 l 8 -8" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {/* Vergangen + Boost-Label */}
        <circle cx="90" cy="40" r="13" fill={color} />
        <path d="M 84 40 l 4 4 l 8 -8" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {/* Aktueller Knoten */}
        <circle cx="150" cy="40" r="15" fill="white" stroke={color} strokeWidth={3} />
        <text x="150" y="44" textAnchor="middle" fontSize="9" fontWeight="700" fill={color}>Jetzt</text>
        {/* Reward-Knoten */}
        <circle cx="210" cy="40" r="14" fill="white" stroke={color} strokeWidth={3} />
      </svg>

      {/* Reward-Icon overlay (positioniert im SVG nicht trivial – dafür separat darunter) */}
      <div className="flex items-center gap-2 p-2 rounded-xl" style={{ background: soft }}>
        <Gift className="w-4 h-4" style={{ color }} />
        <span className="text-[11px] font-semibold text-neutral-900">Kaffee gratis ☕</span>
      </div>

      {/* Empfehlungs-CTA */}
      <div className="rounded-xl p-2 text-white text-[10px] font-semibold flex items-center gap-2" style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}>
        <Rocket className="w-3 h-3" />
        Freunde einladen = +1 Boost
      </div>
    </div>
  );
}

export default MerchantBrandColorCard;
