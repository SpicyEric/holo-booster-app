import { Card } from &ldquo;@/components/ui/card&ldquo;;
import {
  Sparkles, Smartphone, Gift, Users, MessageSquare, Star, Settings, Zap,
} from &ldquo;lucide-react&ldquo;;

const STEPS = [
  {
    icon: Smartphone,
    title: &ldquo;1. Kunden scannen die NFC-Karte&ldquo;,
    desc: &ldquo;Beim Bezahlen halten deine Kunden ihr Smartphone an die NFC-Karte. In der Eloyo-App wird der Check-in automatisch im Treuepass eingetragen.&ldquo;,
  },
  {
    icon: Gift,
    title: &ldquo;2. Belohnungen auf dem Treuepass&ldquo;,
    desc: &ldquo;Im Bereich &bdquo;Treuepass&ldquo; platzierst du per Drag & Drop deine Prämien auf einzelne Check-ins. Sobald ein Kunde diesen Check-in erreicht, kann er die Prämie bei dir einlösen.&ldquo;,
  },
  {
    icon: Users,
    title: &ldquo;3. Kunden & Transaktionen im Blick&ldquo;,
    desc: &ldquo;Unter &bdquo;Kunden & Transaktionen&ldquo; siehst du alle Stammkunden, ihre Check-ins und welche Prämien sie eingelöst haben.&ldquo;,
  },
  {
    icon: MessageSquare,
    title: &ldquo;4. Nachrichten an deine Kunden&ldquo;,
    desc: &ldquo;Mit &bdquo;Nachrichten&ldquo; sendest du gezielte Push-Nachrichten an deine Kundschaft – z. B. Aktionen, Einladungen oder Saisonangebote.&ldquo;,
  },
  {
    icon: Star,
    title: &ldquo;5. Google-Bewertungen&ldquo;,
    desc: &ldquo;Hinterlege deinen Google-Bewertungslink im Profil. Nach einem Check-in werden deine Kunden gefragt, ob sie dich bei Google bewerten möchten.&ldquo;,
  },
  {
    icon: Settings,
    title: &ldquo;6. Einstellungen & Karten-ID&ldquo;,
    desc: &ldquo;In den Einstellungen verknüpfst du deine Karten-ID, verwaltest dein Abo und siehst alle Rechnungen.&ldquo;,
  },
];

const TIPS = [
  { icon: Zap, text: &ldquo;Platziere mehrere kleine Prämien früh im Treuepass – das motiviert zum Wiederkommen.&ldquo; },
  { icon: Sparkles, text: &ldquo;Halte dein Profil aktuell (Logo, Titelbild, Öffnungszeiten) – so wirkst du in der App professionell.&ldquo; },
  { icon: Gift, text: &ldquo;Eine Neukundenprämie sorgt für den ersten Besuch – richte sie bewusst attraktiv ein.&ldquo; },
];

export default function SoFunktionierts() {
  return (
    <div className=&ldquo;min-h-screen&ldquo;>
      <div className=&ldquo;max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8&ldquo;>
        <div>
          <h1 className=&ldquo;text-2xl font-bold text-foreground tracking-tight&ldquo;>So funktioniert's</h1>
          <p className=&ldquo;text-muted-foreground mt-1&ldquo;>
            Eine kurze Übersicht, wie dein Eloyo-System für dich arbeitet.
          </p>
        </div>

        <div className=&ldquo;grid grid-cols-1 md:grid-cols-2 gap-4&ldquo;>
          {STEPS.map((s) => (
            <Card key={s.title} className=&ldquo;rounded-2xl border-border/40 bg-white p-5 shadow-sm&ldquo;>
              <div className=&ldquo;flex items-start gap-4&ldquo;>
                <div className=&ldquo;w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0&ldquo;>
                  <s.icon className=&ldquo;w-5 h-5 text-primary&ldquo; />
                </div>
                <div>
                  <h3 className=&ldquo;text-base font-semibold text-foreground&ldquo;>{s.title}</h3>
                  <p className=&ldquo;text-sm text-muted-foreground mt-1 leading-relaxed&ldquo;>{s.desc}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card className=&ldquo;rounded-2xl border-border/40 bg-white p-6 shadow-sm&ldquo;>
          <div className=&ldquo;flex items-center gap-2 mb-4&ldquo;>
            <Sparkles className=&ldquo;w-4 h-4 text-primary&ldquo; />
            <h2 className=&ldquo;text-base font-semibold text-foreground&ldquo;>Tipps für mehr Wirkung</h2>
          </div>
          <ul className=&ldquo;space-y-3&ldquo;>
            {TIPS.map((t, i) => (
              <li key={i} className=&ldquo;flex items-start gap-3 text-sm text-muted-foreground&ldquo;>
                <t.icon className=&ldquo;w-4 h-4 text-primary mt-0.5 shrink-0&ldquo; />
                <span>{t.text}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
