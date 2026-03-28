import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { WebProtectedRoute } from "@/components/WebProtectedRoute";
import SalesRepSidebar from "@/components/salesrep/SalesRepSidebar";

const SalesRepDashboard = () => {
  useEffect(() => {
    document.body.classList.add('ccm19-right');
    return () => { document.body.classList.remove('ccm19-right'); };
  }, []);

  return (
    <WebProtectedRoute allowedRoles={['sales_partner', 'admin']}>
      <div className="flex min-h-screen w-full bg-[hsl(262,40%,93%)]">
        <SalesRepSidebar />
        <main className="flex-1 min-w-0 overflow-x-hidden p-6">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </WebProtectedRoute>
  );
};

export default SalesRepDashboard;
