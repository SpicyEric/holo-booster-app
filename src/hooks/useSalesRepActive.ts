import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Determines whether the logged-in user is acting as a sales rep on
 * a /vertriebler/* route, and whether their contract is signed (= "active").
 *
 * Active = contract_status === 'angenommen' AND not vertrag_outdated/inaktiv.
 *
 * Provides requireActive() — a guard that shows a toast and returns false
 * if the rep is in the sales-rep context but not yet active.
 */
export function useSalesRepActive() {
  const { user } = useAuth();
  const location = useLocation();
  const isSalesRepRoute = location.pathname.startsWith("/vertriebler");

  const [loading, setLoading] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [contractStatus, setContractStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user || !isSalesRepRoute) {
        if (!cancelled) {
          setIsActive(false);
          setContractStatus(null);
          setLoading(false);
        }
        return;
      }
      const { data } = await (supabase.from("sales_rep_profiles") as any)
        .select("contract_status, vertrag_outdated, vertrag_inaktiv")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;
      const status = data?.contract_status ?? null;
      setContractStatus(status);
      // "Active" = signed & not blocked
      setIsActive(
        status === "angenommen" &&
          !data?.vertrag_outdated &&
          !data?.vertrag_inaktiv
      );
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user, isSalesRepRoute]);

  /**
   * Call before performing a write/search action.
   * Returns true if the action may proceed; otherwise shows a toast.
   * In non-sales-rep contexts (e.g. admin) it always returns true.
   */
  const requireActive = (): boolean => {
    if (!isSalesRepRoute) return true;
    if (isActive) return true;
    toast.error("Vertrag noch nicht angenommen", {
      description:
        "Diese Funktion ist erst verfügbar, sobald dein Vertriebspartnervertrag angenommen wurde.",
    });
    return false;
  };

  return {
    isSalesRepRoute,
    isActive,
    contractStatus,
    loading,
    requireActive,
  };
}
