import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminTopNav } from "@/components/AdminTopNav";
import { Outlet } from "react-router-dom";
import Particles from "@/components/Particles";

const AdminDashboard = () => {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="min-h-screen w-full bg-background">
        <Particles 
          particleColors={['#8B5CF6', '#3B82F6', '#8B5CF6']}
          particleCount={250}
          particleSpread={8}
          speed={0.05}
          particleBaseSize={180}
          sizeRandomness={1.8}
          moveParticlesOnHover={true}
          alphaParticles={true}
          disableRotation={false}
          cameraDistance={20}
        />
        <AdminTopNav />
        <main className="p-8 relative z-10">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default AdminDashboard;
