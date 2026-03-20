import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Outlet } from "react-router-dom";
import MerchantSidebar from "@/components/merchant/MerchantSidebar";

const MerchantLayout = () => {
  return (
    <ProtectedRoute allowedRoles={['merchant', 'admin']}>
      <div className="flex min-h-screen w-full bg-[hsl(260,20%,98%)]">
        <MerchantSidebar />
        <main className="flex-1 min-w-0 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default MerchantLayout;
