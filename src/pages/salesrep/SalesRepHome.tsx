import { lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Rocket,
  ArrowUpRight,
  Zap,
  BatteryCharging,
  Euro,
  Smartphone,
  ShieldCheck,
  LineChart,
  Store,
  ScanLine,
  Sparkles,
  BellRing,
  BarChart3,
  Gift,
  Clock,
  XCircle,
  CalendarCheck,
  Package,
} from "lucide-react";

const StlViewer = lazy(() => import("@/components/StlViewer"));

const FEATURES = [
  { icon: Zap, title: "10 Sekunden", desc: "Vom Scan bis zum ersten Check-in" },
  { icon: BatteryCharging, title: "Kein Strom nötig", desc: "NFC funktioniert ohne Akku" },
  { icon: Euro, title: "Keine Setup-Kosten", desc: "Starterbox inklusive" },
  { icon: ShieldCheck, title: "DSGVO-konform", desc: "Daten bleiben in Deutschland" },
];

export default function SalesRepHome() {
  const navigate = useNavigate();

  return (
    <div className="space-y-16">
      {/* Top Row: Hero text + 3D animation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
        <div className="flex flex-col justify-center py-4 lg:py-8 px-1">
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1] mb-5">
            Loyale Kunden.
            <br />
            Automatisch.
          </h1>
          <p className="text-base text-muted-foreground max-w-md mb-8 leading-relaxed">
            Eloyo verwandelt jeden Kassenmoment in einen treuen Stammkunden –
            ganz ohne Zettel oder Stempelkarte.
          </p>
          <div>
            <Button
              size="lg"
              onClick={() => navigate("/vertriebler/checkout")}
              className="h-14 px-7 text-base font-semibold rounded-2xl bg-gradient-to-r from-[hsl(262,60%,55%)] to-[hsl(262,70%,45%)] hover:from-[hsl(262,60%,50%)] hover:to-[hsl(262,70%,40%)] text-white shadow-lg shadow-purple-500/20 hover:shadow-xl hover:shadow-purple-500/30 transition-all group"
            >
              <Rocket className="h-5 w-5 mr-2" />
              Jetzt Kunde werden
              <ArrowUpRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Button>
          </div>
        </div>

        {/* Right: 3D – centered, larger, floating freely */}
        <div className="flex items-center justify-center lg:justify-center">
          <div className="w-[380px] h-[380px] lg:w-[420px] lg:h-[420px]">
            <Suspense
              fallback={
                <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
                  Lädt 3D-Modell…
                </div>
              }
            >
              <StlViewer
                url="/models/one_card_stand.stl"
                color="#7c3aed"
                autoRotate
              />
            </Suspense>
          </div>
        </div>
      </div>

      {/* Feature tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {FEATURES.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="rounded-2xl bg-white/70 backdrop-blur-sm border border-border/40 p-7 text-center hover:bg-white/90 hover:border-[hsl(262,60%,75%)] transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-purple-500/5"
          >
            <Icon className="h-6 w-6 mx-auto mb-3 text-[hsl(262,60%,55%)]" strokeWidth={2.2} />
            <p className="font-semibold text-sm mb-1 leading-tight">{title}</p>
            <p className="text-xs text-muted-foreground leading-snug">{desc}</p>
          </div>
        ))}
      </div>

      {/* Bottom CTA */}
      <div className="flex flex-col items-center gap-4 pb-4">
        <Button
          size="lg"
          onClick={() => navigate("/vertriebler/checkout")}
          className="h-14 px-8 text-base font-semibold rounded-2xl bg-gradient-to-r from-[hsl(262,60%,55%)] to-[hsl(262,70%,45%)] hover:from-[hsl(262,60%,50%)] hover:to-[hsl(262,70%,40%)] text-white shadow-lg shadow-purple-500/20 hover:shadow-xl hover:shadow-purple-500/30 transition-all group"
        >
          <Rocket className="h-5 w-5 mr-2" />
          Jetzt loslegen
          <ArrowUpRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Button>
        <p className="text-sm text-muted-foreground text-center">
          Monatlich kündbar · Keine Mindestlaufzeit · Starterbox inklusive
        </p>
      </div>

      {/* Section 1: So funktioniert's */}
      <section className="pt-8">
        <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-center mb-12">
          In 3 Schritten live
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {[
            { n: "01", icon: Store, title: "Aufstellen", desc: "Aufsteller und NFC-Karte an die Kasse. Einmal einrichten, fertig." },
            { n: "02", icon: ScanLine, title: "Scannen", desc: "Der Kunde scannt, tippt seine Nummer ein – in unter 10 Sekunden." },
            { n: "03", icon: Sparkles, title: "Automatisch", desc: "Stempel, Prämien, Push-Nachrichten – alles läuft von alleine." },
          ].map(({ n, icon: Icon, title, desc }) => (
            <div key={n} className="rounded-2xl bg-white/70 backdrop-blur-sm border border-border/40 p-6 relative">
              <span className="absolute top-4 right-5 text-4xl font-bold text-[hsl(262,60%,55%)]/15">{n}</span>
              <div className="w-12 h-12 rounded-xl bg-[hsl(262,60%,55%)]/10 flex items-center justify-center mb-4">
                <Icon className="h-6 w-6 text-[hsl(262,60%,55%)]" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
        <div className="flex justify-center mt-10">
          <Button
            size="lg"
            onClick={() => navigate("/vertriebler/checkout")}
            className="h-14 px-8 text-base font-semibold rounded-2xl bg-gradient-to-r from-[hsl(262,60%,55%)] to-[hsl(262,70%,45%)] hover:from-[hsl(262,60%,50%)] hover:to-[hsl(262,70%,40%)] text-white shadow-lg shadow-purple-500/20 hover:shadow-xl transition-all group"
          >
            <Rocket className="h-5 w-5 mr-2" />
            Jetzt Kunde werden
            <ArrowUpRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Button>
        </div>
      </section>

      {/* Section 2: Statement */}
      <section className="rounded-3xl bg-gradient-to-br from-[hsl(262,60%,55%)] to-[hsl(262,70%,40%)] px-8 py-16 lg:py-20 text-center text-white shadow-xl shadow-purple-500/20">
        <p className="text-3xl lg:text-4xl font-bold tracking-tight leading-tight max-w-3xl mx-auto mb-5">
          „Nicht du sprichst Kunden an.<br />Deine Kunden sprechen dich an."
        </p>
        <p className="text-base lg:text-lg text-white/80 max-w-2xl mx-auto leading-relaxed">
          Eloyo sorgt automatisch dafür, dass deine Stammkunden wiederkommen –
          und neue Kunden über dich reden.
        </p>
      </section>

      {/* Section 3: Alternating Features */}
      <section className="space-y-12">
        {[
          { icon: BellRing, title: "Push-Nachrichten direkt aufs Handy", desc: "Schick deinen Stammkunden ein Angebot – direkt als Handy-Benachrichtigung. Kein Social Media, keine E-Mail. Direkt.", reverse: false },
          { icon: BarChart3, title: "Dein Kunde sammelt – du siehst alles", desc: "Im Live-Dashboard siehst du wer kommt, wie oft, und wann. In Echtzeit.", reverse: true },
          { icon: Gift, title: "Prämien die Kunden wirklich wollen", desc: "Du bestimmst was es zu gewinnen gibt. Vom Gratis-Kaffee bis zum Geburtstagsrabatt – alles einstellbar.", reverse: false },
          { icon: Clock, title: "In 20 Minuten live", desc: "Vertrag abschließen, Aufsteller hinstellen, fertig. Kein Techniker, kein Aufwand, kein Strom.", reverse: true },
        ].map(({ icon: Icon, title, desc, reverse }) => (
          <div key={title} className={`grid grid-cols-1 lg:grid-cols-2 gap-8 items-center ${reverse ? "lg:[&>*:first-child]:order-2" : ""}`}>
            <div className="px-2">
              <h3 className="text-2xl lg:text-3xl font-bold tracking-tight mb-4">{title}</h3>
              <p className="text-base text-muted-foreground leading-relaxed max-w-md">{desc}</p>
            </div>
            <div className="flex justify-center">
              <div className="w-56 h-56 rounded-3xl bg-gradient-to-br from-[hsl(262,60%,55%)]/10 to-[hsl(262,70%,45%)]/15 border border-[hsl(262,60%,75%)]/30 flex items-center justify-center">
                <Icon className="h-24 w-24 text-[hsl(262,60%,55%)]" strokeWidth={1.6} />
              </div>
            </div>
          </div>
        ))}
        <div className="flex justify-center pt-4">
          <Button
            size="lg"
            onClick={() => navigate("/vertriebler/checkout")}
            className="h-14 px-8 text-base font-semibold rounded-2xl bg-gradient-to-r from-[hsl(262,60%,55%)] to-[hsl(262,70%,45%)] hover:from-[hsl(262,60%,50%)] hover:to-[hsl(262,70%,40%)] text-white shadow-lg shadow-purple-500/20 hover:shadow-xl transition-all group"
          >
            <Rocket className="h-5 w-5 mr-2" />
            Jetzt Kunde werden
            <ArrowUpRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Button>
        </div>
      </section>

      {/* Section 4: Pricing */}
      <section className="rounded-3xl bg-white/80 backdrop-blur-sm border border-border/40 px-8 py-14 lg:py-16 text-center">
        <h2 className="text-3xl lg:text-4xl font-bold tracking-tight mb-4 max-w-3xl mx-auto leading-tight">
          Software wie aus dem Enterprise – zum Startup-Preis
        </h2>
        <p className="text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
          Tools mit diesem Funktionsumfang kosten 150–200€ pro Monat. Eloyo gibt's ab 49€.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto mb-10">
          {[
            { icon: XCircle, text: "Keine Einmalzahlung" },
            { icon: CalendarCheck, text: "Monatlich kündbar" },
            { icon: Package, text: "Starterbox inklusive" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-[hsl(262,60%,55%)]/10 flex items-center justify-center">
                <Icon className="h-7 w-7 text-[hsl(262,60%,55%)]" />
              </div>
              <p className="font-semibold text-sm">{text}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-col items-center gap-3">
          <Button
            size="lg"
            onClick={() => navigate("/vertriebler/checkout")}
            className="h-14 px-8 text-base font-semibold rounded-2xl bg-gradient-to-r from-[hsl(262,60%,55%)] to-[hsl(262,70%,45%)] hover:from-[hsl(262,60%,50%)] hover:to-[hsl(262,70%,40%)] text-white shadow-lg shadow-purple-500/20 hover:shadow-xl transition-all group"
          >
            <Rocket className="h-5 w-5 mr-2" />
            Jetzt loslegen
            <ArrowUpRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Button>
          <p className="text-sm text-muted-foreground">
            Monatlich kündbar · Keine Mindestlaufzeit · Starterbox inklusive
          </p>
        </div>
      </section>
    </div>
  );
}
