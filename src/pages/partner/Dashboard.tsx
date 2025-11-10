import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { LogOut, Building2 } from "lucide-react";
import qraitLogo from '@/assets/qrait-logo-full.png';
import Particles from "@/components/Particles";

const PartnerDashboard = () => {
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
    <ProtectedRoute allowedRoles={['partner']}>
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
            <img src={qraitLogo} alt="QRait Logo" className="h-10 w-auto" />
            <Button onClick={handleLogout} variant="outline">
              <LogOut className="mr-2 w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-6 sm:p-8 relative z-10">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">
              Partner Dashboard
            </h1>
            <p className="text-muted-foreground text-lg">
              Kunden anlegen & verwalten (coming soon)
            </p>
          </div>

          <Card className="p-12 border-border text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-primary mx-auto mb-4 flex items-center justify-center">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Partner-Funktionen folgen</h2>
            <p className="text-muted-foreground">
              Kundenanlage, Tracking und Provisionen werden bald freigeschaltet
            </p>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default PartnerDashboard;
