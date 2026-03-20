import { useEffect } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminTopNav } from "@/components/AdminTopNav";
import { Outlet } from "react-router-dom";

// Admin Dashboard - nur für User mit App-Rolle 'admin'
const AdminDashboard = () => {
  useEffect(() => {
    document.body.classList.add('ccm19-right');
    return () => { document.body.classList.remove('ccm19-right'); };
  }, []);

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="min-h-screen w-full bg-background">
        <AdminTopNav />
        <main className="p-6">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default AdminDashboard;
