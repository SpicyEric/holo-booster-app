import { useEffect } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Outlet } from "react-router-dom";
import MerchantSidebar from "@/components/merchant/MerchantSidebar";

const MerchantLayout = () => {
  useEffect(() => {
    document.body.classList.add('ccm19-right');
    return () => { document.body.classList.remove('ccm19-right'); };
  }, []);

  return (
    <ProtectedRoute allowedRoles={['merchant', 'admin']}>
      <div className="flex min-h-screen w-full bg-[hsl(262,40%,93%)] font-body">
        <MerchantSidebar />
        <main className="flex-1 min-w-0 overflow-x-hidden font-body">
          <Outlet />
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default MerchantLayout;
