import { useEffect } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Outlet } from "react-router-dom";
import AdminSidebar from "@/components/admin/AdminSidebar";

const AdminDashboard = () => {
  useEffect(() => {
    document.body.classList.add('ccm19-right');
    return () => { document.body.classList.remove('ccm19-right'); };
  }, []);

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="flex min-h-screen w-full bg-gradient-to-br from-[hsl(262,45%,95%)] via-[hsl(262,35%,92%)] to-[hsl(220,40%,93%)] relative">
        {/* Subtle gradient orbs for depth */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-[hsl(262,60%,85%)] opacity-30 blur-[120px]" />
          <div className="absolute top-1/2 -left-40 w-[500px] h-[500px] rounded-full bg-[hsl(220,60%,88%)] opacity-25 blur-[100px]" />
          <div className="absolute -bottom-40 right-1/3 w-[400px] h-[400px] rounded-full bg-[hsl(280,50%,88%)] opacity-20 blur-[100px]" />
        </div>
        <AdminSidebar />
        <main className="flex-1 min-w-0 overflow-x-hidden p-6 relative z-10">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default AdminDashboard;
