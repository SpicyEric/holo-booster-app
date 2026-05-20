import { useState, useMemo } from 'react';
import { Info, ChevronRight, X, Gift, Star } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { cn } from '@/lib/utils';

type Tone = 'blue' | 'green' | 'yellow';
const PRINCIPLES: Array<{ tone: Tone; label: string; text: string }> = [
  { tone: 'blue', label: 'Pflicht', text: 'Position 1 ist immer belegt (Willkommensprämie).' },
  { tone: 'green', label: 'Wichtig', text: 'Zweite Prämie auf Position 4.' },
  { tone: 'yellow', label: 'Empfohlen', text: 'Danach immer Abstand von 4 (1 → 4 → 8 → 12 → 16 …).' },
  { tone: 'green', label: 'Tipp', text: 'Prämien können sich wiederholen.' },
  { tone: 'green', label: 'Tipp', text: 'Hinten raus die stärkste Prämie.' },
  { tone: 'yellow', label: 'Beachten', text: 'Max. 1 Prämie pro Tag einlösbar – nur beim selben Check-in wie die Aktivierung.' },
];

function badgeTone(tone: Tone) {
  switch (tone) {
    case 'blue': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'green': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'yellow': return 'bg-amber-100 text-amber-800 border-amber-200';
  }
}

type ValueTier = 'Klein' | 'Mittel' | 'Groß';
type Row = { pos: number; reward: string; value: ValueTier; cost: string };
type Level = 'simpel' | 'normal' | 'komplex';
type LevelData = { length: number; rows: Row[]; tip: string };
type Branch = { id: string; emoji: string; label: string; levels: Record<Level, LevelData> };

const BRANCHES: Branch[] = [
  {
    id: 'cafe', emoji: '☕', label: 'Café / Bäckerei',
    levels: {
      simpel: { length: 10, tip: 'Für Inhaber die schnell starten wollen.', rows: [
        { pos: 1, reward: 'Gratis Espresso', value: 'Klein', cost: '~0,30 €' },
        { pos: 10, reward: 'Gratis Stück Kuchen', value: 'Klein', cost: '~0,80 €' },
      ]},
      normal: { length: 25, tip: 'Kombination auf 16 ist der Überraschungsmoment.', rows: [
        { pos: 1, reward: 'Gratis Espresso', value: 'Klein', cost: '~0,30 €' },
        { pos: 4, reward: 'Gratis Croissant', value: 'Klein', cost: '~0,40 €' },
        { pos: 8, reward: 'Gratis Stück Kuchen', value: 'Klein', cost: '~0,80 €' },
        { pos: 16, reward: 'Heißgetränk + Gebäck gratis', value: 'Mittel', cost: '~1,20 €' },
        { pos: 25, reward: 'Kleines Frühstück zum halben Preis', value: 'Groß', cost: '~3–4 € Rabatt' },
      ]},
      komplex: { length: 30, tip: 'Der Brunch-Abschluss bringt jemanden mit – sozialer Effekt.', rows: [
        { pos: 1, reward: 'Gratis Espresso', value: 'Klein', cost: '~0,30 €' },
        { pos: 4, reward: 'Gratis Croissant', value: 'Klein', cost: '~0,40 €' },
        { pos: 8, reward: 'Gratis Stück Kuchen', value: 'Klein', cost: '~0,80 €' },
        { pos: 12, reward: 'Gratis Smoothie oder Saft', value: 'Mittel', cost: '~1,50 €' },
        { pos: 16, reward: 'Heißgetränk + Gebäck gratis', value: 'Mittel', cost: '~1,20 €' },
        { pos: 20, reward: 'Gratis Avocado-Toast oder Sandwich', value: 'Mittel', cost: '~2,50 €' },
        { pos: 30, reward: 'Brunch für 2 zum halben Preis', value: 'Groß', cost: '~8–12 € Rabatt' },
      ]},
    },
  },
  {
    id: 'baeckerei', emoji: '🥖', label: 'Bäckerei',
    levels: {
      simpel: { length: 10, tip: 'Bodenständig und ehrlich.', rows: [
        { pos: 1, reward: 'Gratis Breze', value: 'Klein', cost: '~0,20 €' },
        { pos: 10, reward: 'Gratis Brot nach Wahl', value: 'Mittel', cost: '~1,50 €' },
      ]},
      normal: { length: 20, tip: 'Brot am Ende ist echter Alltagswert – jeder braucht es.', rows: [
        { pos: 1, reward: 'Gratis Breze', value: 'Klein', cost: '~0,20 €' },
        { pos: 4, reward: 'Gratis Teilchen', value: 'Klein', cost: '~0,80 €' },
        { pos: 12, reward: 'Gratis 6er Semmeln', value: 'Mittel', cost: '~1,20 €' },
        { pos: 20, reward: 'Gratis Brot nach Wahl', value: 'Mittel', cost: '~1,50 €' },
      ]},
      komplex: { length: 30, tip: 'Saisonprodukte auf 24 fühlen sich jedes Jahr anders an.', rows: [
        { pos: 1, reward: 'Breze', value: 'Klein', cost: '~0,20 €' },
        { pos: 4, reward: 'Teilchen', value: 'Klein', cost: '~0,80 €' },
        { pos: 8, reward: '6er Semmeln', value: 'Mittel', cost: '~1,20 €' },
        { pos: 16, reward: 'Rosinenschnecke + Heißgetränk', value: 'Mittel', cost: '~1,80 €' },
        { pos: 24, reward: 'Saison-Gebäck (Lebkuchen, Oster-Zopf etc.)', value: 'Mittel', cost: '~2,00 €' },
        { pos: 30, reward: 'Brot + Aufschnitt-Päckchen', value: 'Groß', cost: '~4–5 €' },
      ]},
    },
  },
  {
    id: 'barber', emoji: '✂️', label: 'Barbershop',
    levels: {
      simpel: { length: 15, tip: '15 Besuche ≈ 1 Jahr – Gratis-Schnitt als Jahresbonus.', rows: [
        { pos: 1, reward: 'Gratis Haarwäsche', value: 'Klein', cost: '~2 €' },
        { pos: 15, reward: 'Kompletter Haarschnitt gratis', value: 'Groß', cost: '~12–15 €' },
      ]},
      normal: { length: 20, tip: 'Das Sample-Produkt auf 4 ist Upsell-Potenzial.', rows: [
        { pos: 1, reward: 'Gratis Haarwäsche', value: 'Klein', cost: '~2 €' },
        { pos: 4, reward: 'Gratis Bartpflege-Öl Sample', value: 'Klein', cost: '~1,50 €' },
        { pos: 12, reward: 'Gratis Bartschnitt zum Haarschnitt', value: 'Mittel', cost: '~5 €' },
        { pos: 20, reward: 'Kompletter Haarschnitt gratis', value: 'Groß', cost: '~12–15 €' },
      ]},
      komplex: { length: 25, tip: 'Hot Towel und Vollrasur sind Erlebnisse – Kunden reden darüber.', rows: [
        { pos: 1, reward: 'Gratis Haarwäsche', value: 'Klein', cost: '~2 €' },
        { pos: 4, reward: 'Gratis Bartpflege-Öl', value: 'Klein', cost: '~1,50 €' },
        { pos: 8, reward: 'Hot Towel Rasur-Upgrade', value: 'Mittel', cost: '~5 €' },
        { pos: 14, reward: 'Gratis Vollrasur mit Messer', value: 'Mittel', cost: '~8 €' },
        { pos: 20, reward: 'Gratis Haarpflege-Set', value: 'Mittel', cost: '~10 €' },
        { pos: 25, reward: 'Haarschnitt + Bartschnitt gratis', value: 'Groß', cost: '~20–25 €' },
      ]},
    },
  },
  {
    id: 'friseur', emoji: '💇', label: 'Friseursalon',
    levels: {
      simpel: { length: 15, tip: 'Spitzenschneiden auf 8 – viele kommen extra dafür.', rows: [
        { pos: 1, reward: 'Gratis Haarpflege-Spülung', value: 'Klein', cost: '~1 €' },
        { pos: 8, reward: 'Gratis Spitzenschneiden', value: 'Mittel', cost: '~5 €' },
        { pos: 15, reward: 'Gratis Haarkur', value: 'Groß', cost: '~10–15 €' },
      ]},
      normal: { length: 25, tip: 'Rabatt auf Coloration ist einer der wenigen Fälle wo Rabatt besser als Sachprämie ist.', rows: [
        { pos: 1, reward: 'Gratis Spülung', value: 'Klein', cost: '~1 €' },
        { pos: 4, reward: 'Gratis Profi-Haarmaske (Produkt)', value: 'Klein', cost: '~2,50 €' },
        { pos: 10, reward: 'Gratis Spitzenschneiden', value: 'Mittel', cost: '~5 €' },
        { pos: 18, reward: '20% Rabatt auf Coloration', value: 'Mittel', cost: 'variabel' },
        { pos: 25, reward: 'Gratis Haarkur-Behandlung', value: 'Groß', cost: '~15 €' },
      ]},
      komplex: { length: 35, tip: 'Balayage zum halben Preis bei 80–150 € Normalpreis ist ein echter Wow-Moment.', rows: [
        { pos: 1, reward: 'Gratis Spülung', value: 'Klein', cost: '~1 €' },
        { pos: 4, reward: 'Gratis Haarmaske', value: 'Klein', cost: '~2,50 €' },
        { pos: 8, reward: 'Gratis Spitzenschneiden', value: 'Mittel', cost: '~5 €' },
        { pos: 14, reward: 'Gratis Kopfmassage 10 min', value: 'Mittel', cost: '~5 €' },
        { pos: 20, reward: 'Gratis Glossing oder Tönung', value: 'Mittel', cost: '~12 €' },
        { pos: 28, reward: 'Gratis Haarkur + Styling', value: 'Groß', cost: '~18 €' },
        { pos: 35, reward: 'Balayage oder Farbe zum halben Preis', value: 'Groß', cost: '~25–40 € Rabatt' },
      ]},
    },
  },
  {
    id: 'beauty', emoji: '💅', label: 'Beauty / Nagelstudio',
    levels: {
      simpel: { length: 10, tip: 'Gratis Gel-Maniküre am Ende ist ein echter Knaller.', rows: [
        { pos: 1, reward: 'Gratis Nagelpflege (Feilen + Lackieren)', value: 'Klein', cost: '~3 €' },
        { pos: 10, reward: 'Gratis Gel-Maniküre', value: 'Groß', cost: '~15–20 €' },
      ]},
      normal: { length: 20, tip: 'Nail-Art auf 4 ist Instagram-würdig – kostenlose Sichtbarkeit.', rows: [
        { pos: 1, reward: 'Gratis Nagelöl-Behandlung', value: 'Klein', cost: '~1,50 €' },
        { pos: 4, reward: 'Gratis Nail-Art Design (1 Finger)', value: 'Klein', cost: '~2 €' },
        { pos: 12, reward: 'Gratis Paraffin-Handbehandlung', value: 'Mittel', cost: '~5 €' },
        { pos: 20, reward: 'Gratis Gel-Maniküre', value: 'Groß', cost: '~15–20 €' },
      ]},
      komplex: { length: 30, tip: 'Fußpflege auf 24 – Kundinnen probieren es als Prämie und werden oft auch dafür Stammkundinnen.', rows: [
        { pos: 1, reward: 'Gratis Nagelöl-Behandlung', value: 'Klein', cost: '~1,50 €' },
        { pos: 4, reward: 'Gratis Nail-Art Design', value: 'Klein', cost: '~2 €' },
        { pos: 8, reward: 'Gratis Paraffin-Handbehandlung', value: 'Mittel', cost: '~5 €' },
        { pos: 16, reward: 'Gratis Gel-Abnahme + Neulack', value: 'Mittel', cost: '~8 €' },
        { pos: 24, reward: 'Gratis Fußpflege Basis', value: 'Mittel', cost: '~10 €' },
        { pos: 30, reward: 'Gratis Gel-Set Hände + Fuß', value: 'Groß', cost: '~30–35 €' },
      ]},
    },
  },
  {
    id: 'eis', emoji: '🍦', label: 'Eisdiele',
    levels: {
      simpel: { length: 10, tip: 'Kurzer Pass – Kunden spielen ihn in einem Sommer durch.', rows: [
        { pos: 1, reward: '1 Kugel Eis gratis', value: 'Klein', cost: '~0,40 €' },
        { pos: 10, reward: 'Gratis Eisbecher 2 Kugeln + Sahne', value: 'Mittel', cost: '~2 €' },
      ]},
      normal: { length: 15, tip: 'Toppings als Prämie – fast kein Kostenpunkt, aber spürbar für den Kunden.', rows: [
        { pos: 1, reward: '1 Kugel gratis', value: 'Klein', cost: '~0,40 €' },
        { pos: 4, reward: 'Gratis Topping-Upgrade (Waffel, Soße, Nüsse)', value: 'Klein', cost: '~0,60 €' },
        { pos: 8, reward: 'Gratis Eisbecher 2 Kugeln + Sahne + Topping', value: 'Mittel', cost: '~2,50 €' },
        { pos: 15, reward: 'Gratis Spaghetti-Eis oder Sundae', value: 'Groß', cost: '~4 €' },
      ]},
      komplex: { length: 20, tip: 'Das Set für 2 am Ende bringt einen Neukunden mit – sozialer Effekt.', rows: [
        { pos: 1, reward: '1 Kugel gratis', value: 'Klein', cost: '~0,40 €' },
        { pos: 4, reward: 'Gratis Topping-Upgrade', value: 'Klein', cost: '~0,60 €' },
        { pos: 8, reward: 'Gratis Eiskaffee oder Milkshake', value: 'Mittel', cost: '~2 €' },
        { pos: 14, reward: 'Gratis Eisbecher 3 Kugeln + alles', value: 'Mittel', cost: '~3,50 €' },
        { pos: 20, reward: 'Gratis Eisparty-Set für 2 Personen', value: 'Groß', cost: '~5 €' },
      ]},
    },
  },
  {
    id: 'doener', emoji: '🌯', label: 'Döner / Imbiss',
    levels: {
      simpel: { length: 10, tip: 'Zwei Prämien, klar, fertig – ideal wenn Personal wenig Zeit hat.', rows: [
        { pos: 1, reward: 'Gratis Getränk 0,33l', value: 'Klein', cost: '~0,30 €' },
        { pos: 10, reward: 'Gratis Döner im Fladenbrot', value: 'Mittel', cost: '~2,50 €' },
      ]},
      normal: { length: 20, tip: 'Lahmacun auf 12 ist der Überraschungsmoment – konkret, kein Standardrabatt.', rows: [
        { pos: 1, reward: 'Gratis Getränk', value: 'Klein', cost: '~0,30 €' },
        { pos: 4, reward: 'Gratis Portion Pommes', value: 'Klein', cost: '~0,60 €' },
        { pos: 12, reward: 'Gratis Lahmacun', value: 'Mittel', cost: '~1,50 €' },
        { pos: 20, reward: 'Gratis Döner-Teller nach Wahl', value: 'Groß', cost: '~4 €' },
      ]},
      komplex: { length: 30, tip: '30 Besuche ≈ 2 Monate Mittagessen bei Büroarbeitern.', rows: [
        { pos: 1, reward: 'Gratis Getränk', value: 'Klein', cost: '~0,30 €' },
        { pos: 4, reward: 'Gratis Pommes', value: 'Klein', cost: '~0,60 €' },
        { pos: 8, reward: 'Gratis Dip + extra Falafel', value: 'Klein', cost: '~0,80 €' },
        { pos: 14, reward: 'Gratis Lahmacun', value: 'Mittel', cost: '~1,50 €' },
        { pos: 20, reward: 'Gratis Döner im Fladenbrot', value: 'Mittel', cost: '~2,50 €' },
        { pos: 30, reward: 'Gratis Döner-Teller nach Wahl', value: 'Groß', cost: '~4 €' },
      ]},
    },
  },
  {
    id: 'pizza', emoji: '🍕', label: 'Pizzeria / Italiener',
    levels: {
      simpel: { length: 10, tip: 'Bei 10 Besuchen à 15–20 € Bon hat der Kunde 150–200 € ausgegeben – das ist fair.', rows: [
        { pos: 1, reward: 'Gratis Knoblauchbrot', value: 'Klein', cost: '~0,80 €' },
        { pos: 10, reward: 'Gratis Pizza bis Größe M', value: 'Groß', cost: '~6–8 €' },
      ]},
      normal: { length: 20, tip: 'Dessert auf 4 ist persönlich und unerwartet – bleibt in Erinnerung.', rows: [
        { pos: 1, reward: 'Gratis Knoblauchbrot', value: 'Klein', cost: '~0,80 €' },
        { pos: 4, reward: 'Gratis Tiramisu oder Dessert', value: 'Klein', cost: '~1,50 €' },
        { pos: 12, reward: 'Gratis Pasta nach Wahl', value: 'Mittel', cost: '~3 €' },
        { pos: 20, reward: 'Gratis Pizza bis XL', value: 'Groß', cost: '~8–10 €' },
      ]},
      komplex: { length: 25, tip: 'Wein auf 20 macht aus einem normalen Abend etwas Besonderes – Gastronomie-Feeling statt Rabattkultur.', rows: [
        { pos: 1, reward: 'Gratis Knoblauchbrot + Dip', value: 'Klein', cost: '~1 €' },
        { pos: 4, reward: 'Gratis Tiramisu', value: 'Klein', cost: '~1,50 €' },
        { pos: 8, reward: 'Gratis Bruschetta 3er', value: 'Mittel', cost: '~2,50 €' },
        { pos: 14, reward: 'Gratis Pasta oder Risotto', value: 'Mittel', cost: '~4 €' },
        { pos: 20, reward: 'Gratis Hauswein 0,25l zum Essen', value: 'Mittel', cost: '~3 €' },
        { pos: 25, reward: 'Pizza + Dessert für 2 zum halben Preis', value: 'Groß', cost: '~8–12 € Rabatt' },
      ]},
    },
  },
];

const LEVELS: Array<{ id: Level; label: string; emoji: string; desc: (rows: number) => string; activeClass: string }> = [
  { id: 'simpel', label: 'Simpel', emoji: '⚡', desc: (n) => `${n} Prämien — schnell startklar, minimaler Aufwand`, activeClass: 'bg-emerald-500 text-white border-emerald-500' },
  { id: 'normal', label: 'Normal', emoji: '✦', desc: (n) => `${n} Prämien — gute Mischung, motivierender Rhythmus`, activeClass: 'bg-blue-500 text-white border-blue-500' },
  { id: 'komplex', label: 'Komplex', emoji: '🔥', desc: (n) => `${n} Prämien — maximales Engagement, durchdachter Bogen`, activeClass: 'bg-violet-500 text-white border-violet-500' },
];

function valueBadge(v: ValueTier) {
  switch (v) {
    case 'Klein': return 'bg-slate-100 text-slate-700 border-slate-200';
    case 'Mittel': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'Groß': return 'bg-violet-100 text-violet-700 border-violet-200';
  }
}

function PassRow({ length, positions }: { length: number; positions: Set<number> }) {
  const max = Math.min(length, 20);
  const dots = Array.from({ length: max }, (_, i) => i + 1);
  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {dots.map((n) => {
        const filled = positions.has(n);
        const isOne = n === 1;
        return (
          <div
            key={n}
            className={cn(
              'relative w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold border',
              isOne && 'bg-blue-500 text-white border-blue-500',
              !isOne && filled && 'bg-violet-500 text-white border-violet-500',
              !isOne && !filled && 'bg-slate-100 text-slate-400 border-slate-200',
            )}
          >
            {n}
            {isOne && <Star className="absolute -top-1 -right-1 w-3 h-3 fill-amber-400 text-amber-400" />}
            {!isOne && filled && <Gift className="absolute -top-1 -right-1 w-3 h-3 text-violet-700" />}
          </div>
        );
      })}
      {length > 20 && (
        <span className="text-xs text-muted-foreground ml-1">… bis {length}</span>
      )}
    </div>
  );
}

function GuideBody({ onClose }: { onClose: () => void }) {
  const [branchId, setBranchId] = useState(BRANCHES[0].id);
  const [level, setLevel] = useState<Level>('normal');

  const branch = useMemo(() => BRANCHES.find((b) => b.id === branchId)!, [branchId]);
  const data = branch.levels[level];
  const positions = useMemo(() => new Set(data.rows.map((r) => r.pos)), [data]);
  const levelMeta = LEVELS.find((l) => l.id === level)!;

  return (
    <div className="space-y-6">
      {/* Grundprinzipien */}
      <section className="space-y-2.5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Grundprinzipien
        </h3>
        <ul className="space-y-1.5">
          {PRINCIPLES.map((p, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm">
              <span className={cn('shrink-0 mt-0.5 inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-semibold', badgeTone(p.tone))}>
                {p.label}
              </span>
              <span className="text-foreground/90 leading-snug">{p.text}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Beispiele */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Beispiele nach Branche
        </h3>

        {/* Branch Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {BRANCHES.map((b) => {
            const active = b.id === branchId;
            return (
              <button
                key={b.id}
                onClick={() => setBranchId(b.id)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-medium text-left transition-colors',
                  active
                    ? 'bg-violet-500 text-white border-violet-500 shadow-sm'
                    : 'bg-background hover:bg-muted border-border text-foreground/80',
                )}
              >
                <span className="text-base leading-none">{b.emoji}</span>
                <span className="leading-tight">{b.label}</span>
              </button>
            );
          })}
        </div>

        {/* Level Tabs */}
        <div className="grid grid-cols-3 gap-1.5">
          {LEVELS.map((l) => {
            const active = l.id === level;
            return (
              <button
                key={l.id}
                onClick={() => setLevel(l.id)}
                className={cn(
                  'flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border text-sm font-semibold transition-colors',
                  active ? l.activeClass : 'bg-background hover:bg-muted border-border text-foreground/70',
                )}
              >
                <span>{l.emoji}</span>
                <span>{l.label}</span>
              </button>
            );
          })}
        </div>

        {/* Detail Card */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="p-4 space-y-3">
            <div className="flex items-start gap-2 flex-wrap">
              <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold', levelMeta.activeClass)}>
                {levelMeta.emoji} {levelMeta.label}
              </span>
              <span className="text-sm text-muted-foreground">
                {levelMeta.desc(data.rows.length)}
              </span>
            </div>

            <div className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Passlänge {data.length} Check-ins</span>
              {' · '}
              <span>{data.rows.length} Prämien</span>
              {' · '}
              <span>Positionen: {data.rows.map((r) => r.pos).join(', ')}</span>
            </div>

            <PassRow length={data.length} positions={positions} />

            <div className="overflow-x-auto -mx-4 px-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground border-b">
                    <th className="py-2 pr-2 font-medium">Pos.</th>
                    <th className="py-2 pr-2 font-medium">Prämie</th>
                    <th className="py-2 pr-2 font-medium">Wert</th>
                    <th className="py-2 font-medium">Kosten ca.</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.pos} className="border-b last:border-b-0">
                      <td className="py-2 pr-2 font-bold text-violet-600">{r.pos}</td>
                      <td className="py-2 pr-2">{r.reward}</td>
                      <td className="py-2 pr-2">
                        <span className={cn('inline-flex px-2 py-0.5 rounded-full border text-[11px] font-semibold', valueBadge(r.value))}>
                          {r.value}
                        </span>
                      </td>
                      <td className="py-2 text-muted-foreground whitespace-nowrap">{r.cost}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-l-4 border-violet-500 bg-violet-50 px-3 py-2 rounded-r-md">
              <div className="text-[11px] font-bold uppercase tracking-wide text-violet-700">Praxis-Tipp</div>
              <p className="text-sm text-violet-900 mt-0.5 leading-snug">{data.tip}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="pt-1">
        <button
          onClick={onClose}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors active:scale-[0.98]"
        >
          Verstanden
        </button>
      </div>
    </div>
  );
}

export default function TreuepassGuideBanner() {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full group flex items-center gap-3 rounded-xl border border-violet-300/60 bg-violet-500/10 hover:bg-violet-500/15 transition-colors px-4 py-3 text-left"
      >
        <span className="shrink-0 w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center">
          <Info className="w-4 h-4 text-violet-700" />
        </span>
        <span className="flex-1 text-sm text-violet-900 leading-snug">
          <span className="font-semibold">
            Erste Prämie auf Position 1, zweite auf 4 – danach immer +4.
          </span>{' '}
          Hinten raus die stärkste Prämie.{' '}
          <span className="underline underline-offset-2 font-medium">
            Leitfaden anzeigen
          </span>
        </span>
        <ChevronRight className="w-4 h-4 text-violet-700 shrink-0 transition-transform group-hover:translate-x-0.5" />
      </button>

      {isMobile ? (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="max-h-[90vh]">
            <div className="px-4 pb-6 pt-2 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Treuepass richtig aufbauen</h2>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-md p-1.5 hover:bg-muted"
                  aria-label="Schließen"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <GuideBody onClose={() => setOpen(false)} />
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-[580px] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Treuepass richtig aufbauen</DialogTitle>
            </DialogHeader>
            <GuideBody onClose={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
