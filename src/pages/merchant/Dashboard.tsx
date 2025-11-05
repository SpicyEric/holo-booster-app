import { ProtectedRoute } from "@/components/ProtectedRoute";
import { GlassCard } from "@/components/GlassCard";
import { GradientButton } from "@/components/GradientButton";
import { CircularProgress } from "@/components/CircularProgress";
import { signOut } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { LogOut, QrCode, Gift, TrendingUp } from "lucide-react";

const MerchantDashboard = () => {
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
    <ProtectedRoute allowedRoles={['merchant']}>
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Merchant Dashboard
              </h1>
              <p className="text-muted-foreground mt-2">
                Deine Statistiken, Gutscheine & Materialien
              </p>
            </div>
            <GradientButton onClick={handleLogout} icon={LogOut}>
              Logout
            </GradientButton>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <GlassCard>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
                  <QrCode className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Scans heute</p>
                  <p className="text-2xl font-bold">23</p>
                </div>
              </div>
            </GlassCard>

            <GlassCard>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Neue Kontakte</p>
                  <p className="text-2xl font-bold">18</p>
                </div>
              </div>
            </GlassCard>

            <GlassCard>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
                  <Gift className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Einlösungen</p>
                  <p className="text-2xl font-bold">14</p>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Progress Circles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <GlassCard className="flex items-center justify-center p-12">
              <CircularProgress value={73} label="73%" subLabel="Conversion" />
            </GlassCard>
            
            <GlassCard className="p-6">
              <h3 className="text-xl font-semibold mb-4">Kumulative Kontakte</h3>
              <p className="text-muted-foreground">
                Chart mit ansteigender Kurve kommt hier
              </p>
            </GlassCard>
          </div>

          {/* Actions */}
          <GlassCard>
            <h2 className="text-2xl font-bold mb-4">QR-Code & Materialien</h2>
            <div className="flex gap-4">
              <GradientButton icon={QrCode}>
                QR-Code herunterladen
              </GradientButton>
              <GradientButton>
                Aufsteller bestellen
              </GradientButton>
            </div>
          </GlassCard>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default MerchantDashboard;
