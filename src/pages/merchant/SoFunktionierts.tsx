import { Card } from "@/components/ui/card";
import {
  Sparkles, Smartphone, Gift, Users, MessageSquare, Star, Settings, Zap,
} from "lucide-react";

const STEPS = [
  {
    icon: Smartphone,
    title: "1. Kunden scannen die NFC-Karte",
    desc: "Beim Bezahlen halten deine Kunden ihr Smartphone an die NFC-Karte. In der Eloyo-App wird der Check-in automatisch im Treuepass eingetragen.",
  },
  {
    icon: Gift,
    title: "2. Belohnungen auf dem Treuepass",
    desc: 'Im Bereich "Treuepass" platzierst du per Drag & Drop deine Prämien auf einzelne Check-ins. Sobald ein Kunde diesen Check-in erreicht, kann er die Prämie bei dir einlösen.',
  },
  {
    icon: Users,
    title: "3. Kunden & Transaktionen im Blick",
    desc: 'Unter "Kunden & Transaktionen" siehst du alle Stammkunden, ihre Check-ins und welche Prämien sie eingelöst haben.',
  },
  {
    icon: MessageSquare,
    title: "4. Nachrichten an deine Kunden",
    desc: 'Mit "Nachrichten" sendest du gezielte Push-Nachrichten an deine Kundschaft – z. B. Aktionen, Einladungen oder Saisonangebote.',
  },
  {
    icon: Star,
    title: "5. Google-Bewertungen",
    desc: "Hinterlege deinen Google-Bewertungslink im Profil. Nach einem Check-in werden deine Kunden gefragt, ob sie dich bei Google bewerten möchten.",
  },
  {
    icon: Settings,
    title: "6. Einstellungen & Karten-ID",
    desc: "In den Einstellungen verknüpfst du deine Karten-ID, verwaltest dein Abo und siehst alle Rechnungen.",
  },
];

const TIPS = [
  { icon: Zap, text: "Platziere mehrere kleine Prämien früh im Treuepass – das motiviert zum Wiederkommen." },
  { icon: Sparkles, text: "Halte dein Profil aktuell (Logo, Titelbild, Öffnungszeiten) – so wirkst du in der App professionell." },
  { icon: Gift, text: "Eine Neukundenprämie sorgt für den ersten Besuch – richte sie bewusst attraktiv ein." },
];

export default function SoFunktionierts() {
  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">So funktioniert's</h1>
          <p className="text-muted-foreground mt-1">
            Eine kurze Übersicht, wie dein Eloyo-System für dich arbeitet.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {STEPS.map((s) => (
            <Card key={s.title} className="rounded-2xl border-border/40 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <s.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">{s.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card className="rounded-2xl border-border/40 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Tipps für mehr Wirkung</h2>
          </div>
          <ul className="space-y-3">
            {TIPS.map((t, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                <t.icon className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <span>{t.text}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
