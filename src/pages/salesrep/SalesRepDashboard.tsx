import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { WebProtectedRoute } from "@/components/WebProtectedRoute";
import SalesRepSidebar from "@/components/salesrep/SalesRepSidebar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Clock, Package } from "lucide-react";

interface BoxWarning {
  box_id: string;
  days_remaining: number;
  frist_ablauf: string;
}

const SalesRepDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contractWarning, setContractWarning] = useState<{ show: boolean; daysLeft: number }>({ show: false, daysLeft: 0 });
  const [inactivityWarning, setInactivityWarning] = useState<{ show: boolean; daysSince: number }>({ show: false, daysSince: 0 });
  const [deletionWarning, setDeletionWarning] = useState<{ show: boolean; daysLeft: number }>({ show: false, daysLeft: 0 });
  const [boxWarnings, setBoxWarnings] = useState<BoxWarning[]>([]);

  useEffect(() => {
    document.body.classList.add('ccm19-right');
    return () => { document.body.classList.remove('ccm19-right'); };
  }, []);

  useEffect(() => {
    if (!user) return;
    const checkProfile = async () => {
      const { data } = await supabase
        .from('sales_rep_profiles')
        .select('contract_status, contract_deadline, activated_at, last_conversion_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        const status = (data as any).contract_status;
        if (status === 'pending') {
          const deadline = (data as any).contract_deadline;
          const daysLeft = deadline
            ? Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
            : 30;
          setContractWarning({ show: true, daysLeft });
        } else if (status === 'submitted') {
          setContractWarning({ show: true, daysLeft: -1 });
        }

        // Inactivity timer: starts at activated_at, resets on last_conversion_at
        const activatedAt = (data as any).activated_at;
        const lastConv = (data as any).last_conversion_at;
        if (activatedAt) {
          const referenceDate = lastConv
            ? new Date(Math.max(new Date(activatedAt).getTime(), new Date(lastConv).getTime()))
            : new Date(activatedAt);
          const daysSince = Math.floor((Date.now() - referenceDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysSince >= 75) {
            setInactivityWarning({ show: true, daysSince });
          }
          if (daysSince >= 300) {
            const daysLeft = Math.max(0, 365 - daysSince);
            setDeletionWarning({ show: true, daysLeft });
          }
        }
      }
    };

    const checkBoxWarnings = async () => {
      const { data: boxes } = await supabase
        .from('eloyo_boxes')
        .select('box_id, frist_ablauf')
        .eq('vertriebler_id', user.id)
        .eq('status', 'versendet')
        .not('frist_ablauf', 'is', null);

      if (boxes) {
        const warnings: BoxWarning[] = [];
        for (const box of boxes) {
          const days = Math.ceil((new Date(box.frist_ablauf!).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          if (days <= 15) {
            warnings.push({ box_id: box.box_id, days_remaining: days, frist_ablauf: box.frist_ablauf! });
          }
        }
        setBoxWarnings(warnings);
      }
    };

    checkProfile();
    checkBoxWarnings();
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
            {boxWarnings.length > 0 && (
              <button
                onClick={() => navigate('/vertriebler/nachrichten')}
                className="mb-6 w-full flex items-start gap-3 p-4 rounded-lg bg-orange-50 border border-orange-200 hover:bg-orange-100 transition-colors text-left"
              >
                <Package className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-orange-700">
                    ⚠️ {boxWarnings.length} Box{boxWarnings.length > 1 ? 'en' : ''} {boxWarnings.length > 1 ? 'laufen' : 'läuft'} bald ab
                  </p>
                  <p className="text-sm text-orange-600">
                    {boxWarnings.map(w => `${w.box_id}: noch ${w.days_remaining} Tag${w.days_remaining !== 1 ? 'e' : ''}`).join(' · ')}
                  </p>
                  <p className="text-xs text-orange-500 mt-1">
                    Klicke hier für Details →
                  </p>
                </div>
              </button>
            )}
            {inactivityWarning.show && (
              <div className={`mb-6 flex items-start gap-3 p-4 rounded-lg ${
                inactivityWarning.daysSince >= 90
                  ? 'bg-destructive/10 border border-destructive/20'
                  : 'bg-orange-50 border border-orange-200'
              }`}>
                <Clock className={`h-5 w-5 shrink-0 mt-0.5 ${
                  inactivityWarning.daysSince >= 90 ? 'text-destructive' : 'text-orange-600'
                }`} />
                <div>
                  <p className={`font-medium ${
                    inactivityWarning.daysSince >= 90 ? 'text-destructive' : 'text-orange-700'
                  }`}>
                    {inactivityWarning.daysSince >= 90
                      ? 'Provisionen pausiert – Inaktivität'
                      : 'Inaktivitäts-Warnung'}
                  </p>
                  <p className={`text-sm ${
                    inactivityWarning.daysSince >= 90 ? 'text-destructive/80' : 'text-orange-600'
                  }`}>
                    {inactivityWarning.daysSince >= 90
                      ? `Du hast seit ${inactivityWarning.daysSince} Tagen keinen neuen Abschluss. Deine Provisionen sind pausiert, bis ein neuer Abschluss erfolgt.`
                      : `Du hast seit ${inactivityWarning.daysSince} Tagen keinen neuen Abschluss. Ab 90 Tagen werden deine Provisionen pausiert.`}
                  </p>
                </div>
              </div>
            )}
            {deletionWarning.show && (
              <div className="mb-6 flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">Account-Löschung in {deletionWarning.daysLeft} Tagen</p>
                  <p className="text-sm text-destructive/80">
                    {deletionWarning.daysLeft === 0
                      ? 'Dein Account wird in Kürze automatisch gelöscht, da seit über 365 Tagen kein Abschluss erfolgt ist.'
                      : `Ohne neuen Kundenabschluss wird dein Account in ${deletionWarning.daysLeft} Tagen automatisch gelöscht.`}
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
