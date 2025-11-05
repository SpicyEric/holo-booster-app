import { ProtectedRoute } from "@/components/ProtectedRoute";
import { GlassCard } from "@/components/GlassCard";
import { GradientButton } from "@/components/GradientButton";
import { signOut } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { LogOut, Users, QrCode, BarChart3, Settings } from "lucide-react";

const AdminDashboard = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error("Logout fehlgeschlagen");
    } else {
      toast.success("Erfolgreich abgemeldet");
      navigate('/auth');
    }
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Admin Dashboard
              </h1>
              <p className="text-muted-foreground mt-2">
                Kundenverwaltung, QR-Codes & Statistiken
              </p>
            </div>
            <GradientButton onClick={handleLogout} icon={LogOut}>
              Logout
            </GradientButton>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <GlassCard>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Aktive Kunden</p>
                  <p className="text-2xl font-bold">12</p>
                </div>
              </div>
            </GlassCard>

            <GlassCard>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
                  <QrCode className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Scans (7T)</p>
                  <p className="text-2xl font-bold">342</p>
                </div>
              </div>
            </GlassCard>

            <GlassCard>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Neue Kontakte</p>
                  <p className="text-2xl font-bold">89</p>
                </div>
              </div>
            </GlassCard>

            <GlassCard>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
                  <Settings className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Offene Orders</p>
                  <p className="text-2xl font-bold">3</p>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GlassCard>
              <h2 className="text-2xl font-bold mb-4">Kundenliste</h2>
              <p className="text-muted-foreground">
                Hier erscheinen alle Kunden mit QR-Generator, Stats & Verwaltung
              </p>
            </GlassCard>

            <GlassCard>
              <h2 className="text-2xl font-bold mb-4">Rollen-Management</h2>
              <p className="text-muted-foreground">
                Admins, Partner & Merchants verwalten
              </p>
            </GlassCard>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default AdminDashboard;
