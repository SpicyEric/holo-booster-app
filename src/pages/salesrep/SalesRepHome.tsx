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
  { icon: Smartphone, title: "Push-Nachrichten", desc: "Direkt aufs Handy deiner Kunden" },
  { icon: ShieldCheck, title: "DSGVO-konform", desc: "Daten bleiben in Deutschland" },
  { icon: LineChart, title: "Live-Statistiken", desc: "Wer kommt, wann, wie oft" },
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {FEATURES.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="rounded-2xl bg-white/70 backdrop-blur-sm border border-border/40 p-5 text-center hover:bg-white/90 hover:border-[hsl(262,60%,75%)] transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-purple-500/5"
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
    </div>
  );
}
