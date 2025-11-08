import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminTopNav } from "@/components/AdminTopNav";
import { Outlet } from "react-router-dom";

const AdminDashboard = () => {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="min-h-screen w-full bg-background">
        <AdminTopNav />
        <main className="p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default AdminDashboard;
