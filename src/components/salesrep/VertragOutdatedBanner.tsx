import { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Globaler Banner für Vertriebspartner: zeigt sich, wenn der Vertrag eine
 * neue Version benötigt (vertrag_outdated = true) oder bereits inaktiv ist.
 */
export function VertragOutdatedBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [outdated, setOutdated] = useState(false);
  const [outdatedSeit, setOutdatedSeit] = useState<string | null>(null);
  const [inaktiv, setInaktiv] = useState(false);

  const reload = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase.from("sales_rep_profiles") as any)
      .select("vertrag_outdated, vertrag_outdated_seit, vertrag_inaktiv")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!data) return;
    setOutdated(!!data.vertrag_outdated);
    setOutdatedSeit(data.vertrag_outdated_seit || null);
    setInaktiv(!!data.vertrag_inaktiv);
  }, [user]);

  // Initial load + Re-check on route change (z.B. nach Annahme zurück auf Dashboard)
  useEffect(() => {
    reload();
  }, [reload, location.pathname]);

  // Realtime-Update wenn das Profil geändert wird (z.B. nach sign-contract)
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`sales-rep-vertrag-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sales_rep_profiles",
          filter: `user_id=eq.${user.id}`,
        },
        () => reload()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, reload]);

  if (!outdated && !inaktiv) return null;
  // Auf Vertragsseite selbst nicht doppelt zeigen
  if (location.pathname.startsWith("/vertriebler/vertrag")) return null;

  const tageOffen = outdatedSeit
    ? Math.max(0, 30 - Math.floor((Date.now() - new Date(outdatedSeit).getTime()) / 86_400_000))
    : 30;

  return (
    <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-start gap-3 mb-4">
      <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-medium text-destructive">
          {inaktiv
            ? "Dein Account ist gesperrt – du hast die neue Vertragsversion nicht innerhalb von 30 Tagen angenommen."
            : `Neue Vertragsversion verfügbar – bitte innerhalb von ${tageOffen} Tagen annehmen.`}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {inaktiv
            ? "Boxenbestellung und Auszahlung sind gesperrt, bis du die neue Version annimmst."
            : "Wird die neue Version nicht innerhalb der Frist angenommen, werden Boxenbestellung und Auszahlung gesperrt."}
        </p>
        <Button variant="destructive" size="sm" className="mt-3" onClick={() => navigate("/vertriebler/vertrag")}>
          Zum Vertrag →
        </Button>
      </div>
    </div>
  );
}
