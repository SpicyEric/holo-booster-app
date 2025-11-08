import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Outlet } from "react-router-dom";

const AdminDashboard = () => {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <SidebarProvider defaultOpen={false}>
        <div className="min-h-screen w-full relative">
          <AdminSidebar />
          <main className="w-full p-8 bg-background">
            <div className="max-w-7xl mx-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </SidebarProvider>
    </ProtectedRoute>
  );
};

export default AdminDashboard;
