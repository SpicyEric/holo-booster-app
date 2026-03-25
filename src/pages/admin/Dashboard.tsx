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
      <div className="flex min-h-screen w-full bg-[hsl(262,40%,93%)]">
        <AdminSidebar />
        <main className="flex-1 min-w-0 overflow-x-hidden p-6">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default AdminDashboard;
