import { useNavigate } from "react-router-dom";
import { ArrowLeft, Eye } from "lucide-react";
import { useDemoMerchant } from "@/hooks/useDemoMerchant";
import { disableDemoMerchant, DEMO_MERCHANT_NAME } from "@/lib/demoMerchant";

/**
 * Sticky banner shown across the merchant area while in Demo-Merchant mode.
 * Reminds the admin/sales-rep that nothing they do here will be saved
 * and provides a quick way back to their own account.
 */
export default function DemoMerchantBanner() {
  const active = useDemoMerchant();
  const navigate = useNavigate();

  if (!active) return null;

  const handleExit = () => {
    const returnPath = disableDemoMerchant();
    navigate(returnPath, { replace: true });
  };

  return (
    <div className="sticky top-0 z-30 w-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-amber-950 shadow-md border-b border-amber-600/40">
      <div className="max-w-[1600px] mx-auto px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-full bg-amber-950/15 flex items-center justify-center shrink-0">
            <Eye className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight">
              Demo-Modus: Du siehst die Merchant-Ansicht von „{DEMO_MERCHANT_NAME}".
            </p>
            <p className="text-[11px] opacity-80 leading-tight">
              Du kannst dich frei umsehen — Änderungen werden nicht gespeichert.
            </p>
          </div>
        </div>
        <button
          onClick={handleExit}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-950 text-amber-50 text-xs font-semibold hover:bg-amber-900 transition-colors active:scale-[0.97] shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Zurück zu meinem Konto
        </button>
      </div>
    </div>
  );
}
