import { useState } from 'react';
import { Info, ChevronRight, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useIsMobile } from '@/hooks/use-mobile';
import { Drawer, DrawerContent } from '@/components/ui/drawer';

const PRINCIPLES: Array<{ badge: string; tone: 'blue' | 'green' | 'yellow'; title: string; body: string }> = [
  {
    badge: '🔵 PFLICHT',
    tone: 'blue',
    title: 'Position 1 ist immer belegt',
    body: 'Die Willkommensprämie. Jeder Neukunde bekommt sie sofort beim ersten Check-in. Ohne diese Prämie funktioniert das System nicht richtig.',
  },
  {
    badge: '🟢 WICHTIG',
    tone: 'green',
    title: 'Zweite Prämie auf Position 4',
    body: 'Nach einer Boost-Einladung (+1 Check-in) und einer Google-Bewertung (+1 Check-in) braucht ein Neukunde nur noch einen einzigen Besuch bis zur zweiten Prämie. Das ist der stärkste Hook für neue Stammkunden.',
  },
  {
    badge: '🟡 EMPFOHLEN',
    tone: 'yellow',
    title: 'Danach immer Abstand von 4',
    body: 'Also: 1 → 4 → 8 → 12 → 16 → 20 → 24 → 28 usw. Gleichmäßiger Rhythmus – nah genug um motivierend zu bleiben, weit genug um Wert zu behalten.',
  },
  {
    badge: '🟢 TIPP',
    tone: 'green',
    title: 'Prämien können sich wiederholen',
    body: 'Kein Zwang zur Abwechslung. Kaffee auf 1, Breze auf 4, Kaffee auf 8, Breze auf 12 – das ist völlig okay und oft sogar besser.',
  },
  {
    badge: '🟢 TIPP',
    tone: 'green',
    title: 'Hinten raus steigern',
    body: 'Die stärkste Prämie kommt ans Ende des Zyklus. Das motiviert Kunden den Pass wirklich durchzuspielen.',
  },
  {
    badge: '🟡 BEACHTEN',
    tone: 'yellow',
    title: 'Maximal 1 Prämie pro Tag einlösbar',
    body: 'Eine Prämie kann nur beim selben Check-in eingelöst werden, bei dem sie aktiviert wurde. Nicht nachträglich.',
  },
];

const EXAMPLES: Array<{ id: string; emoji: string; label: string; sub: string; rows: Array<{ pos: number; reward: string }> }> = [
  {
    id: 'cafe',
    emoji: '☕',
    label: 'Café / Bäckerei',
    sub: '25 Check-ins, 5 Prämien',
    rows: [
      { pos: 1, reward: 'Gratis Espresso oder Filterkaffee' },
      { pos: 4, reward: 'Gratis Croissant oder Breze' },
      { pos: 8, reward: 'Gratis Stück Kuchen nach Wahl' },
      { pos: 16, reward: 'Heißgetränk + Gebäck gratis (Kombi)' },
      { pos: 25, reward: 'Kleines Frühstück zum halben Preis' },
    ],
  },
  {
    id: 'barber',
    emoji: '✂️',
    label: 'Barbershop',
    sub: '20 Check-ins, 4 Prämien',
    rows: [
      { pos: 1, reward: 'Gratis Haarwäsche beim nächsten Besuch' },
      { pos: 4, reward: 'Gratis Bartpflege-Öl (kleines Sample)' },
      { pos: 12, reward: 'Gratis Bartschnitt zum Haarschnitt' },
      { pos: 20, reward: 'Kompletter Haarschnitt gratis' },
    ],
  },
  {
    id: 'eis',
    emoji: '🍦',
    label: 'Eisdiele',
    sub: '15 Check-ins, 3 Prämien',
    rows: [
      { pos: 1, reward: '1 Kugel gratis' },
      { pos: 6, reward: 'Gratis Eisbecher (2 Kugeln + Sahne)' },
      { pos: 15, reward: 'Gratis Spaghetti-Eis oder Sundae' },
    ],
  },
  {
    id: 'doener',
    emoji: '🌯',
    label: 'Dönerladen / Imbiss',
    sub: '30 Check-ins, 6 Prämien',
    rows: [
      { pos: 1, reward: 'Gratis Getränk (Wasser oder Cola 0,33l)' },
      { pos: 4, reward: 'Gratis Portion Pommes' },
      { pos: 8, reward: 'Gratis Dip-Sauce + extra Falafel' },
      { pos: 14, reward: 'Gratis Lahmacun' },
      { pos: 20, reward: 'Gratis Döner im Fladenbrot' },
      { pos: 30, reward: 'Gratis Döner-Teller nach Wahl' },
    ],
  },
];

function toneClasses(tone: 'blue' | 'green' | 'yellow') {
  switch (tone) {
    case 'blue':
      return 'border-blue-300/60 bg-blue-50 text-blue-900';
    case 'green':
      return 'border-emerald-300/60 bg-emerald-50 text-emerald-900';
    case 'yellow':
      return 'border-amber-300/60 bg-amber-50 text-amber-900';
  }
}

function GuideBody({ onClose }: { onClose: () => void }) {
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Grundprinzipien
        </h3>
        <div className="space-y-2.5">
          {PRINCIPLES.map((p, i) => (
            <div
              key={i}
              className={`rounded-lg border p-3 ${toneClasses(p.tone)}`}
            >
              <div className="text-[11px] font-bold tracking-wide">{p.badge}</div>
              <div className="font-semibold text-sm mt-0.5">{p.title}</div>
              <p className="text-sm mt-1 opacity-90 leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Beispiele nach Geschäftstyp
        </h3>
        <Accordion type="single" collapsible className="w-full">
          {EXAMPLES.map((ex) => (
            <AccordionItem key={ex.id} value={ex.id}>
              <AccordionTrigger className="text-left">
                <span className="flex items-center gap-2">
                  <span className="text-lg">{ex.emoji}</span>
                  <span className="font-semibold">{ex.label}</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    ({ex.sub})
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-1.5 pl-1">
                  {ex.rows.map((r) => (
                    <li key={r.pos} className="flex gap-3 text-sm">
                      <span className="font-semibold text-primary min-w-[88px]">
                        Position {r.pos}:
                      </span>
                      <span>{r.reward}</span>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <div className="pt-2">
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
          <DialogContent className="max-w-[560px] max-h-[85vh] overflow-y-auto">
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
