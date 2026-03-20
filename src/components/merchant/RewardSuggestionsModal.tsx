import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Gift, Sparkles } from 'lucide-react';

// ─── Types ───
interface ExampleReward {
  title: string;
  category: 'small' | 'medium' | 'large';
  value_type: 'product' | 'discount' | 'bundle';
  estimated_value: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  merchantIndustry: string | null;
  avgOrderValue: number;
  onSelectReward: (title: string, pointsRequired: number) => void;
}

// ─── Points logic ───
const AVG_POINTS_PER_VISIT = 10; // middle stamp default

function calculateRewardPoints(estimatedValue: number, avgOrderValue: number): number {
  if (avgOrderValue <= 0) avgOrderValue = 10;
  // value_factor scales with how expensive the reward is relative to avg order
  const ratio = estimatedValue / avgOrderValue;
  let targetVisits: number;
  if (ratio <= 0.5) targetVisits = 5;
  else if (ratio <= 1.0) targetVisits = 7;
  else if (ratio <= 2.0) targetVisits = 10;
  else if (ratio <= 3.0) targetVisits = 14;
  else targetVisits = 18;

  const raw = AVG_POINTS_PER_VISIT * targetVisits;
  // Round to nearest 5
  return Math.max(5, Math.round(raw / 5) * 5);
}

// ─── Industry data ───
const INDUSTRY_REWARDS: Record<string, ExampleReward[]> = {
  cafe: [
    { title: 'Espresso gratis', category: 'small', value_type: 'product', estimated_value: 2 },
    { title: 'Sirup / Shot gratis', category: 'small', value_type: 'product', estimated_value: 1 },
    { title: 'Kleines Gebäck gratis', category: 'small', value_type: 'product', estimated_value: 3 },
    { title: 'Cappuccino gratis', category: 'medium', value_type: 'product', estimated_value: 4 },
    { title: 'Kaffee + Kuchen Rabatt', category: 'medium', value_type: 'bundle', estimated_value: 6 },
    { title: 'Frühstücks-Upgrade', category: 'medium', value_type: 'product', estimated_value: 5 },
    { title: 'Frühstück gratis', category: 'large', value_type: 'product', estimated_value: 10 },
    { title: '2 Kaffees + Kuchen', category: 'large', value_type: 'bundle', estimated_value: 12 },
    { title: 'Frühstück für 2 Rabatt', category: 'large', value_type: 'discount', estimated_value: 15 },
  ],
  baeckerei: [
    { title: 'Brötchen gratis', category: 'small', value_type: 'product', estimated_value: 1 },
    { title: 'Croissant gratis', category: 'small', value_type: 'product', estimated_value: 2 },
    { title: 'Kaffee gratis', category: 'small', value_type: 'product', estimated_value: 2 },
    { title: '3 Brötchen gratis', category: 'medium', value_type: 'bundle', estimated_value: 3 },
    { title: 'Kaffee + Teilchen', category: 'medium', value_type: 'bundle', estimated_value: 5 },
    { title: 'Kleines Frühstück', category: 'medium', value_type: 'product', estimated_value: 6 },
    { title: 'Frühstück gratis', category: 'large', value_type: 'product', estimated_value: 10 },
    { title: '5€ Gutschein', category: 'large', value_type: 'discount', estimated_value: 5 },
    { title: 'Frühstück für 2 Rabatt', category: 'large', value_type: 'discount', estimated_value: 15 },
  ],
  restaurant: [
    { title: 'Getränk gratis', category: 'small', value_type: 'product', estimated_value: 3 },
    { title: 'Dessert gratis', category: 'small', value_type: 'product', estimated_value: 5 },
    { title: 'Vorspeise gratis', category: 'small', value_type: 'product', estimated_value: 6 },
    { title: 'Hauptgericht Rabatt', category: 'medium', value_type: 'discount', estimated_value: 10 },
    { title: '2 Getränke gratis', category: 'medium', value_type: 'bundle', estimated_value: 6 },
    { title: 'Menü Upgrade', category: 'medium', value_type: 'product', estimated_value: 8 },
    { title: 'Hauptgericht gratis', category: 'large', value_type: 'product', estimated_value: 15 },
    { title: 'Dinner Rabatt', category: 'large', value_type: 'discount', estimated_value: 20 },
    { title: '10€ Gutschein', category: 'large', value_type: 'discount', estimated_value: 10 },
  ],
  imbiss: [
    { title: 'Getränk gratis', category: 'small', value_type: 'product', estimated_value: 2 },
    { title: 'Pommes gratis', category: 'small', value_type: 'product', estimated_value: 3 },
    { title: 'Extra gratis', category: 'small', value_type: 'product', estimated_value: 1 },
    { title: 'Menü Upgrade', category: 'medium', value_type: 'product', estimated_value: 5 },
    { title: 'Burger / Döner gratis', category: 'medium', value_type: 'product', estimated_value: 6 },
    { title: '2 Getränke gratis', category: 'medium', value_type: 'bundle', estimated_value: 4 },
    { title: 'Menü gratis', category: 'large', value_type: 'product', estimated_value: 10 },
    { title: '5€ Gutschein', category: 'large', value_type: 'discount', estimated_value: 5 },
    { title: 'Menü für 2 Rabatt', category: 'large', value_type: 'discount', estimated_value: 15 },
  ],
  friseur: [
    { title: 'Styling gratis', category: 'small', value_type: 'product', estimated_value: 5 },
    { title: 'Pflegeprobe gratis', category: 'small', value_type: 'product', estimated_value: 3 },
    { title: 'Kopfmassage gratis', category: 'small', value_type: 'product', estimated_value: 5 },
    { title: 'Waschen + Styling', category: 'medium', value_type: 'bundle', estimated_value: 10 },
    { title: '10€ Rabatt', category: 'medium', value_type: 'discount', estimated_value: 10 },
    { title: 'Pflegebehandlung', category: 'medium', value_type: 'product', estimated_value: 12 },
    { title: 'Haarschnitt gratis', category: 'large', value_type: 'product', estimated_value: 30 },
    { title: '20€ Gutschein', category: 'large', value_type: 'discount', estimated_value: 20 },
    { title: 'Komplettpaket Rabatt', category: 'large', value_type: 'discount', estimated_value: 40 },
  ],
  barbershop: [
    { title: 'Getränk gratis', category: 'small', value_type: 'product', estimated_value: 2 },
    { title: 'Bartpflege gratis', category: 'small', value_type: 'product', estimated_value: 5 },
    { title: 'Styling gratis', category: 'small', value_type: 'product', estimated_value: 5 },
    { title: 'Bart trimmen', category: 'medium', value_type: 'product', estimated_value: 10 },
    { title: '10€ Rabatt', category: 'medium', value_type: 'discount', estimated_value: 10 },
    { title: 'Haarwäsche gratis', category: 'medium', value_type: 'product', estimated_value: 8 },
    { title: 'Haarschnitt gratis', category: 'large', value_type: 'product', estimated_value: 20 },
    { title: 'Komplettpaket Rabatt', category: 'large', value_type: 'discount', estimated_value: 30 },
    { title: '20€ Gutschein', category: 'large', value_type: 'discount', estimated_value: 20 },
  ],
  kosmetikstudio: [
    { title: 'Augenbrauen zupfen', category: 'small', value_type: 'product', estimated_value: 8 },
    { title: 'Pflegeprobe gratis', category: 'small', value_type: 'product', estimated_value: 3 },
    { title: 'Handmassage gratis', category: 'small', value_type: 'product', estimated_value: 5 },
    { title: '10€ Rabatt', category: 'medium', value_type: 'discount', estimated_value: 10 },
    { title: 'Behandlung Rabatt', category: 'medium', value_type: 'discount', estimated_value: 15 },
    { title: 'Zusatzservice gratis', category: 'medium', value_type: 'product', estimated_value: 10 },
    { title: 'Behandlung gratis', category: 'large', value_type: 'product', estimated_value: 40 },
    { title: '20€ Gutschein', category: 'large', value_type: 'discount', estimated_value: 20 },
    { title: 'Komplettpaket Rabatt', category: 'large', value_type: 'discount', estimated_value: 60 },
  ],
  shishabar: [
    { title: 'Tee gratis', category: 'small', value_type: 'product', estimated_value: 2 },
    { title: 'Snack gratis', category: 'small', value_type: 'product', estimated_value: 3 },
    { title: 'Tabak Upgrade', category: 'small', value_type: 'product', estimated_value: 3 },
    { title: 'Shisha gratis', category: 'medium', value_type: 'product', estimated_value: 10 },
    { title: '2 Getränke gratis', category: 'medium', value_type: 'bundle', estimated_value: 5 },
    { title: '5€ Rabatt', category: 'medium', value_type: 'discount', estimated_value: 5 },
    { title: 'Shisha + Drinks', category: 'large', value_type: 'bundle', estimated_value: 20 },
    { title: '10€ Gutschein', category: 'large', value_type: 'discount', estimated_value: 10 },
    { title: 'Gruppenrabatt', category: 'large', value_type: 'discount', estimated_value: 25 },
  ],
  einzelhandel: [
    { title: '5% Rabatt', category: 'small', value_type: 'discount', estimated_value: 3 },
    { title: 'Goodie gratis', category: 'small', value_type: 'product', estimated_value: 2 },
    { title: '3€ Rabatt', category: 'small', value_type: 'discount', estimated_value: 3 },
    { title: '10€ Rabatt', category: 'medium', value_type: 'discount', estimated_value: 10 },
    { title: '15% Rabatt', category: 'medium', value_type: 'discount', estimated_value: 10 },
    { title: 'Produkt gratis (klein)', category: 'medium', value_type: 'product', estimated_value: 8 },
    { title: '20€ Gutschein', category: 'large', value_type: 'discount', estimated_value: 20 },
    { title: '25% Rabatt', category: 'large', value_type: 'discount', estimated_value: 20 },
    { title: 'Einkauf Rabatt', category: 'large', value_type: 'discount', estimated_value: 30 },
  ],
  apotheke: [
    { title: 'Pflegeprobe gratis', category: 'small', value_type: 'product', estimated_value: 2 },
    { title: '3€ Rabatt', category: 'small', value_type: 'discount', estimated_value: 3 },
    { title: 'Vitaminprobe gratis', category: 'small', value_type: 'product', estimated_value: 3 },
    { title: '5€ Rabatt', category: 'medium', value_type: 'discount', estimated_value: 5 },
    { title: 'Produkt gratis', category: 'medium', value_type: 'product', estimated_value: 8 },
    { title: '10% Rabatt', category: 'medium', value_type: 'discount', estimated_value: 5 },
    { title: '10€ Gutschein', category: 'large', value_type: 'discount', estimated_value: 10 },
    { title: 'Produkt groß gratis', category: 'large', value_type: 'product', estimated_value: 15 },
    { title: '20% Rabatt', category: 'large', value_type: 'discount', estimated_value: 15 },
  ],
  tankstelle: [
    { title: 'Kaffee gratis', category: 'small', value_type: 'product', estimated_value: 2 },
    { title: 'Snack gratis', category: 'small', value_type: 'product', estimated_value: 3 },
    { title: '2€ Rabatt', category: 'small', value_type: 'discount', estimated_value: 2 },
    { title: '5€ Rabatt', category: 'medium', value_type: 'discount', estimated_value: 5 },
    { title: 'Tankrabatt', category: 'medium', value_type: 'discount', estimated_value: 5 },
    { title: 'Snack Bundle', category: 'medium', value_type: 'bundle', estimated_value: 5 },
    { title: '10€ Gutschein', category: 'large', value_type: 'discount', estimated_value: 10 },
    { title: 'Shop Einkauf Rabatt', category: 'large', value_type: 'discount', estimated_value: 10 },
    { title: 'Tankrabatt groß', category: 'large', value_type: 'discount', estimated_value: 15 },
  ],
  kiosk: [
    { title: 'Getränk gratis', category: 'small', value_type: 'product', estimated_value: 2 },
    { title: 'Snack gratis', category: 'small', value_type: 'product', estimated_value: 2 },
    { title: '2€ Rabatt', category: 'small', value_type: 'discount', estimated_value: 2 },
    { title: '5€ Rabatt', category: 'medium', value_type: 'discount', estimated_value: 5 },
    { title: 'Bundle gratis', category: 'medium', value_type: 'bundle', estimated_value: 5 },
    { title: '20% Rabatt', category: 'medium', value_type: 'discount', estimated_value: 5 },
    { title: '10€ Gutschein', category: 'large', value_type: 'discount', estimated_value: 10 },
    { title: 'Einkauf Rabatt', category: 'large', value_type: 'discount', estimated_value: 10 },
    { title: 'Bundle groß', category: 'large', value_type: 'bundle', estimated_value: 15 },
  ],
  fitnessstudio: [
    { title: 'Getränk gratis', category: 'small', value_type: 'product', estimated_value: 3 },
    { title: 'Personal Training', category: 'small', value_type: 'product', estimated_value: 5 },
    { title: 'Protein-Shake gratis', category: 'small', value_type: 'product', estimated_value: 4 },
    { title: 'Woche gratis', category: 'medium', value_type: 'product', estimated_value: 15 },
    { title: 'Kurs gratis', category: 'medium', value_type: 'product', estimated_value: 10 },
    { title: '10€ Rabatt', category: 'medium', value_type: 'discount', estimated_value: 10 },
    { title: 'Monat gratis', category: 'large', value_type: 'product', estimated_value: 40 },
    { title: '20€ Gutschein', category: 'large', value_type: 'discount', estimated_value: 20 },
    { title: 'Personal Training Session', category: 'large', value_type: 'product', estimated_value: 50 },
  ],
  nagelstudio: [
    { title: 'Nail-Design gratis', category: 'small', value_type: 'product', estimated_value: 5 },
    { title: 'Handpflege gratis', category: 'small', value_type: 'product', estimated_value: 5 },
    { title: '5€ Rabatt', category: 'small', value_type: 'discount', estimated_value: 5 },
    { title: '10€ Rabatt', category: 'medium', value_type: 'discount', estimated_value: 10 },
    { title: 'Maniküre gratis', category: 'medium', value_type: 'product', estimated_value: 15 },
    { title: 'Upgrade gratis', category: 'medium', value_type: 'product', estimated_value: 10 },
    { title: 'Behandlung gratis', category: 'large', value_type: 'product', estimated_value: 30 },
    { title: '20€ Gutschein', category: 'large', value_type: 'discount', estimated_value: 20 },
    { title: 'Komplettset Rabatt', category: 'large', value_type: 'discount', estimated_value: 40 },
  ],
  eisdiele: [
    { title: 'Kugel Eis gratis', category: 'small', value_type: 'product', estimated_value: 1.5 },
    { title: 'Topping gratis', category: 'small', value_type: 'product', estimated_value: 1 },
    { title: 'Getränk gratis', category: 'small', value_type: 'product', estimated_value: 2 },
    { title: '3 Kugeln gratis', category: 'medium', value_type: 'bundle', estimated_value: 4 },
    { title: 'Eisbecher gratis', category: 'medium', value_type: 'product', estimated_value: 6 },
    { title: '5€ Rabatt', category: 'medium', value_type: 'discount', estimated_value: 5 },
    { title: 'Eis für 2 gratis', category: 'large', value_type: 'bundle', estimated_value: 10 },
    { title: '10€ Gutschein', category: 'large', value_type: 'discount', estimated_value: 10 },
    { title: 'Familien-Rabatt', category: 'large', value_type: 'discount', estimated_value: 15 },
  ],
  waschsalon: [
    { title: '5% Rabatt', category: 'small', value_type: 'discount', estimated_value: 3 },
    { title: 'Zusatzleistung gratis', category: 'small', value_type: 'product', estimated_value: 3 },
    { title: '3€ Rabatt', category: 'small', value_type: 'discount', estimated_value: 3 },
    { title: '10€ Rabatt', category: 'medium', value_type: 'discount', estimated_value: 10 },
    { title: '15% Rabatt', category: 'medium', value_type: 'discount', estimated_value: 10 },
    { title: 'Upgrade gratis', category: 'medium', value_type: 'product', estimated_value: 8 },
    { title: '20€ Gutschein', category: 'large', value_type: 'discount', estimated_value: 20 },
    { title: 'Service gratis', category: 'large', value_type: 'product', estimated_value: 20 },
    { title: 'Rabatt groß', category: 'large', value_type: 'discount', estimated_value: 25 },
  ],
  sonstiges: [
    { title: '5% Rabatt', category: 'small', value_type: 'discount', estimated_value: 3 },
    { title: 'Zusatzleistung gratis', category: 'small', value_type: 'product', estimated_value: 3 },
    { title: '3€ Rabatt', category: 'small', value_type: 'discount', estimated_value: 3 },
    { title: '10€ Rabatt', category: 'medium', value_type: 'discount', estimated_value: 10 },
    { title: '15% Rabatt', category: 'medium', value_type: 'discount', estimated_value: 10 },
    { title: 'Upgrade gratis', category: 'medium', value_type: 'product', estimated_value: 8 },
    { title: '20€ Gutschein', category: 'large', value_type: 'discount', estimated_value: 20 },
    { title: 'Service gratis', category: 'large', value_type: 'product', estimated_value: 20 },
    { title: 'Rabatt groß', category: 'large', value_type: 'discount', estimated_value: 25 },
  ],
};

const INDUSTRY_LABELS: Record<string, string> = {
  cafe: 'Café', baeckerei: 'Bäckerei', restaurant: 'Restaurant', imbiss: 'Imbiss',
  friseur: 'Friseur', barbershop: 'Barbershop', kosmetikstudio: 'Kosmetikstudio',
  shishabar: 'Shishabar', einzelhandel: 'Einzelhandel', apotheke: 'Apotheke',
  tankstelle: 'Tankstelle', kiosk: 'Kiosk', fitnessstudio: 'Fitnessstudio',
  nagelstudio: 'Nagelstudio', eisdiele: 'Eisdiele', waschsalon: 'Waschsalon',
  sonstiges: 'Sonstiges',
};

const CATEGORY_META = {
  small: { label: 'Klein', emoji: '🟢', color: 'bg-emerald-50 border-emerald-200 text-emerald-700', visits: '~5–7 Besuche' },
  medium: { label: 'Mittel', emoji: '🔵', color: 'bg-blue-50 border-blue-200 text-blue-700', visits: '~8–12 Besuche' },
  large: { label: 'Groß', emoji: '🔴', color: 'bg-rose-50 border-rose-200 text-rose-700', visits: '~12–20 Besuche' },
};

export default function RewardSuggestionsModal({ open, onOpenChange, merchantIndustry, avgOrderValue, onSelectReward }: Props) {
  const defaultIndustry = merchantIndustry || 'sonstiges';
  const [selectedIndustry, setSelectedIndustry] = useState(defaultIndustry);

  // Reset to own industry when modal opens
  const handleOpenChange = (v: boolean) => {
    if (v) setSelectedIndustry(defaultIndustry);
    onOpenChange(v);
  };

  const rewards = useMemo(() => INDUSTRY_REWARDS[selectedIndustry] || INDUSTRY_REWARDS.sonstiges, [selectedIndustry]);
  const grouped = useMemo(() => ({
    small: rewards.filter(r => r.category === 'small'),
    medium: rewards.filter(r => r.category === 'medium'),
    large: rewards.filter(r => r.category === 'large'),
  }), [rewards]);

  const avg = avgOrderValue || 10;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl rounded-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Prämienbeispiele
          </DialogTitle>
          <DialogDescription>
            Passend zu deiner Branche – klicke auf <Plus className="inline h-3.5 w-3.5" />, um eine Prämie direkt zu übernehmen
          </DialogDescription>
        </DialogHeader>

        {/* Industry switcher */}
        <div className="flex items-center gap-2 pb-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Branche:</span>
          <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
            <SelectTrigger className="rounded-xl w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(INDUSTRY_LABELS).map(([val, lbl]) => (
                <SelectItem key={val} value={val}>
                  {lbl}{val === defaultIndustry ? ' (deine)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Scrollable reward grid */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-1 pb-2">
          {(['small', 'medium', 'large'] as const).map(cat => {
            const meta = CATEGORY_META[cat];
            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="text-base">{meta.emoji}</span>
                  <h3 className="font-semibold text-foreground text-sm">{meta.label}</h3>
                  <Badge variant="outline" className="rounded-full text-xs font-normal">{meta.visits}</Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {grouped[cat].map((reward, i) => {
                    const pts = calculateRewardPoints(reward.estimated_value, avg);
                    return (
                      <div
                        key={i}
                        className={`relative p-3.5 rounded-xl border ${meta.color} transition-all hover:shadow-md group`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm leading-tight">{reward.title}</p>
                            <p className="text-xs mt-1 opacity-70">~{reward.estimated_value.toFixed(reward.estimated_value % 1 ? 1 : 0)}€ Wert</p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 rounded-lg opacity-60 group-hover:opacity-100 group-hover:bg-white/80 transition-opacity shrink-0"
                            onClick={() => onSelectReward(reward.title, pts)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="mt-2">
                          <Badge variant="secondary" className="rounded-full text-xs">
                            <Gift className="h-3 w-3 mr-1" />{pts} Punkte
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
