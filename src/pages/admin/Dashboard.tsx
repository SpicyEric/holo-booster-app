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
      <div className="flex min-h-screen w-full font-body" style={{
        background: 'linear-gradient(135deg, hsl(262 83% 96%) 0%, hsl(0 0% 99%) 40%, hsl(220 60% 97%) 100%)',
      }}>
        {/* Subtle radial purple glow top-left */}
        <div className="pointer-events-none fixed inset-0 z-0" style={{
          background: 'radial-gradient(ellipse 60% 50% at 0% 0%, hsl(262 70% 88% / 0.5) 0%, transparent 70%)',
        }} />
        <AdminSidebar />
        <main className="relative z-10 flex-1 min-w-0 overflow-x-hidden p-6">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default AdminDashboard;
