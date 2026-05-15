import { Card } from "@/components/ui/card";
import {
  Sparkles, Smartphone, Gift, Users, MessageSquare, Star, Zap,
  Palette, Clock, Award,
} from "lucide-react";

const STEPS = [
  {
    icon: Smartphone,
    title: "1. Kunden scannen den Aufsteller",
    desc: "Der Aufsteller erledigt die Arbeit. Kunden scannen den QR-Code, laden die App und sammeln ihren ersten Check-in – ganz ohne, dass dein Personal eingreifen muss. Ein gutes Design zieht von alleine.",
  },
  {
    icon: Gift,
    title: "2. Erste Prämie beim ersten Check-in",
    desc: "Die Prämie, die du ganz vorne im Treuepass platzierst, macht den ersten Scan attraktiv. Kunden lösen sie direkt bei dir im Laden ein – das erste Gespräch entsteht von selbst.",
  },
  {
    icon: Star,
    title: "3. Treuepass bindet Kunden ans Geschäft",
    desc: "Sobald Kunden drin sind, sehen sie: Da kommen noch mehr Prämien. Das motiviert zum Wiederkommen – und macht aus Neukunden echte Stammkunden über Jahre.",
  },
  {
    icon: Users,
    title: "4. Kunden bringen Kunden – mit Boosts",
    desc: "Kunden können Freunde einladen. Beide bekommen einen Check-in. Wer mehrere einlädt, wird mit Boosts belohnt: 1, 2, 3, 1, 2, 3 – der Anreiz steigt konstant, mehr Menschen ins Geschäft zu schicken.",
  },
  {
    icon: MessageSquare,
    title: "5. Google-Bewertungen & Nachrichten",
    desc: "Kunden können für eine Google-Bewertung einen Check-in verdienen – das motiviert tatsächlich. Und sobald du eine Kundenbasis aufgebaut hast, schickst du mit einem Klick Push-Nachrichten direkt aufs Handy deiner Stammkunden.",
  },
  {
    icon: Palette,
    title: "6. Designs anfordern unter Profil",
    desc: "Unter „Profil“ kannst du einmal pro Monat ein komplett individuelles Aufsteller-Design bei eloyo anfragen – kostenlos, ohne eloyo-Logo, nur dein Name und dein Branding. Saisonal angepasst, z. B. für Halloween, Weihnachten oder ein neues Produkt.",
  },
];

const TIPS = [
  { icon: Zap, text: "Frühe Prämien setzen – Platziere mehrere kleine Prämien früh im Treuepass. Wer schnell was bekommt, kommt wieder." },
  { icon: Award, text: "Erste Prämie attraktiv wählen – Was beim ersten Check-in wartet, entscheidet, ob Kunden überhaupt mitmachen. Mach sie unwiderstehlich." },
  { icon: Clock, text: "Saisonal neue Designs anfragen – Ein Aufsteller mit Halloween-Krapfen oder Weihnachts-Spezial zieht deutlich mehr Scans als ein Blankodesign. Nutze das monatliche Kontingent." },
  { icon: Sparkles, text: "Profil vollständig ausfüllen – Logo, Titelbild, Öffnungszeiten. So wirkst du in der App professionell und vertrauenswürdig." },
];

export default function SoFunktionierts() {
  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">So funktioniert's</h1>
          <p className="text-muted-foreground mt-1">
            Dein Eloyo-System arbeitet für dich – vollautomatisch, ohne dass du aktiv werden musst.
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
