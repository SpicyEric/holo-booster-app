import { useEffect } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Outlet } from "react-router-dom";
import MerchantSidebar from "@/components/merchant/MerchantSidebar";
import DemoMerchantBanner from "@/components/DemoMerchantBanner";
import { isDemoMerchantActive } from "@/lib/demoMerchant";
import { useDemoMerchant } from "@/hooks/useDemoMerchant";
import { MerchantBrandTheme } from "@/components/merchant/MerchantBrandTheme";

const MerchantLayout = () => {
  useEffect(() => {
    document.body.classList.add('ccm19-right');
    return () => { document.body.classList.remove('ccm19-right'); };
  }, []);

  const demoActive = useDemoMerchant();
  // Im Demo-Modus dürfen auch Admin und Partner die Merchant-Sicht öffnen.
  const allowedRoles: any[] = demoActive
    ? ['merchant', 'admin', 'partner']
    : ['merchant', 'admin'];

  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <div className="flex min-h-screen w-full bg-[hsl(262,40%,93%)] font-body">
        <MerchantSidebar />
        <main className="flex-1 min-w-0 overflow-x-hidden font-body flex flex-col">
          <DemoMerchantBanner />
          <div className="flex-1 min-w-0">
            <Outlet />
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default MerchantLayout;
