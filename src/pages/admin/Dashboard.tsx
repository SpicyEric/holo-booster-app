import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Outlet } from "react-router-dom";

const AdminDashboard = () => {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <SidebarProvider defaultOpen={false}>
        <div className="relative min-h-screen w-full">
          <AdminSidebar />
          <div className="w-full">
            <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-6">
              <SidebarTrigger className="hover:bg-muted rounded-md" />
              <div className="flex-1">
                <h2 className="text-lg font-semibold">QRait Admin</h2>
              </div>
            </header>
            <main className="w-full p-8 bg-background">
              <div className="max-w-7xl mx-auto">
                <Outlet />
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </ProtectedRoute>
  );
};

export default AdminDashboard;
