import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CircularProgress } from "@/components/CircularProgress";
import { signOut } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { LogOut, QrCode, Gift, TrendingUp, Download, ShoppingBag } from "lucide-react";
import eloyoLogo from '@/assets/eloyo-logo.png';
import Particles from "@/components/Particles";

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
    <ProtectedRoute allowedRoles={['kunde', 'admin']}>
      <div className="min-h-screen bg-background">
        <Particles 
          particleColors={['#8B5CF6', '#3B82F6', '#8B5CF6']}
          particleCount={100}
          particleSpread={8}
          speed={0.05}
          particleBaseSize={100}
          sizeRandomness={1.5}
          moveParticlesOnHover={true}
          alphaParticles={true}
          disableRotation={false}
          cameraDistance={20}
        />
        <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <img src={eloyoLogo} alt="Eloyo Logo" className="h-10 w-auto" />
            <Button onClick={handleLogout} variant="outline">
              <LogOut className="mr-2 w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-6 sm:p-8 relative z-10">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">
              Händler Dashboard
            </h1>
            <p className="text-muted-foreground text-lg">
              Ihre Statistiken, Prämien & Materialien
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="p-6 border-border hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
                  <QrCode className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Scans heute</p>
                  <p className="text-2xl font-bold">23</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 border-border hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Neue Kontakte</p>
                  <p className="text-2xl font-bold">18</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 border-border hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
                  <Gift className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Einlösungen</p>
                  <p className="text-2xl font-bold">14</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Progress Circles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card className="flex items-center justify-center p-12 border-border">
              <CircularProgress value={73} label="73%" subLabel="Conversion" />
            </Card>
            
            <Card className="p-6 border-border">
              <h3 className="text-xl font-semibold mb-4">Kumulative Kontakte</h3>
              <p className="text-muted-foreground">
                Chart mit ansteigender Kurve kommt hier
              </p>
            </Card>
          </div>

          {/* Actions */}
          <Card className="p-6 border-border">
            <h2 className="text-2xl font-bold mb-4">NFC-Stempel & Materialien</h2>
            <div className="flex flex-wrap gap-4">
              <Button className="bg-foreground text-background hover:bg-foreground/90">
                <Download className="mr-2 w-4 h-4" />
                QR-Code herunterladen
              </Button>
              <Button variant="outline">
                <ShoppingBag className="mr-2 w-4 h-4" />
                Aufsteller bestellen
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default MerchantDashboard;
