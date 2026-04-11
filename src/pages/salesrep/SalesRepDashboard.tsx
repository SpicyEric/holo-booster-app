import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { WebProtectedRoute } from "@/components/WebProtectedRoute";
import SalesRepSidebar from "@/components/salesrep/SalesRepSidebar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle } from "lucide-react";

const SalesRepDashboard = () => {
  const { user } = useAuth();
  const [contractWarning, setContractWarning] = useState<{ show: boolean; daysLeft: number }>({ show: false, daysLeft: 0 });

  useEffect(() => {
    document.body.classList.add('ccm19-right');
    return () => { document.body.classList.remove('ccm19-right'); };
  }, []);

  useEffect(() => {
    if (!user) return;
    const checkContract = async () => {
      const { data } = await supabase
        .from('sales_rep_profiles')
        .select('contract_status, contract_deadline')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        const status = (data as any).contract_status;
        if (status === 'pending' && (data as any).contract_deadline) {
          const daysLeft = Math.max(0, Math.ceil((new Date((data as any).contract_deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
          setContractWarning({ show: true, daysLeft });
        } else if (status === 'submitted') {
          setContractWarning({ show: true, daysLeft: -1 });
        }
      }
    };
    checkContract();
  }, [user]);

  return (
    <WebProtectedRoute allowedRoles={['sales_partner', 'admin']}>
      <div className="flex min-h-screen w-full bg-[hsl(262,40%,93%)]">
        <SalesRepSidebar />
        <main className="flex-1 min-w-0 overflow-x-hidden p-6">
          <div className="max-w-7xl mx-auto">
            {contractWarning.show && contractWarning.daysLeft === -1 && (
              <div className="mb-6 flex items-start gap-3 p-4 rounded-lg bg-blue-50 border border-blue-200">
                <AlertTriangle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-700">Vertrag eingereicht</p>
                  <p className="text-sm text-blue-600">
                    Dein Vertrag wird aktuell noch zur Freigabe geprüft. Du wirst benachrichtigt, sobald er freigegeben wurde.
                  </p>
                </div>
              </div>
            )}
            {contractWarning.show && contractWarning.daysLeft >= 0 && (
              <div className="mb-6 flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">Vertrag noch nicht eingereicht</p>
                  <p className="text-sm text-destructive/80">
                    Bitte lade deinen unterschriebenen Vertrag unter Einstellungen → Steuern & Vertrag hoch.
                    Dein Account wird in {contractWarning.daysLeft} Tagen automatisch gelöscht, wenn kein Vertrag vorliegt.
                  </p>
                </div>
              </div>
            )}
            <Outlet />
          </div>
        </main>
      </div>
    </WebProtectedRoute>
  );
};

export default SalesRepDashboard;
