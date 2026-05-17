import { lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { UserPlus, ArrowUpRight } from "lucide-react";
import appPreview from "@/assets/vertriebler-app-preview.png";
import aufsteller from "@/assets/vertriebler-aufsteller.png";

const StlViewer = lazy(() => import("@/components/StlViewer"));

export default function SalesRepHome() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Top Row: Hero text + 3D animation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Hero copy */}
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
              <UserPlus className="h-5 w-5 mr-2" />
              Kunde hinzufügen
              <ArrowUpRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Button>
          </div>
        </div>

        {/* Right: 3D Check-in Terminal */}
        <div className="rounded-3xl bg-gradient-to-br from-[hsl(262,30%,12%)] to-[hsl(262,40%,18%)] overflow-hidden min-h-[360px] lg:min-h-[420px] relative">
          <div className="absolute top-4 left-5 text-xs font-medium text-white/60 tracking-wide z-10">
            Check-in Terminal
          </div>
          <Suspense
            fallback={
              <div className="w-full h-full flex items-center justify-center text-sm text-white/40">
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

      {/* Bottom Row: App preview + Aufsteller */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-white/60 border border-border/40 overflow-hidden flex items-center justify-center p-6 min-h-[360px]">
          <img
            src={appPreview}
            alt="Eloyo App Vorschau"
            className="max-h-[420px] w-auto object-contain drop-shadow-2xl"
          />
        </div>
        <div className="rounded-3xl bg-white/60 border border-border/40 overflow-hidden flex items-center justify-center p-6 min-h-[360px]">
          <img
            src={aufsteller}
            alt="Eloyo Aufsteller"
            className="max-h-[420px] w-auto object-contain drop-shadow-2xl"
          />
        </div>
      </div>
    </div>
  );
}
