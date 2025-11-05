import { ProtectedRoute } from "@/components/ProtectedRoute";
import { GlassCard } from "@/components/GlassCard";
import { GradientButton } from "@/components/GradientButton";
import { signOut } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { LogOut, Building2 } from "lucide-react";

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
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Partner Dashboard
              </h1>
              <p className="text-muted-foreground mt-2">
                Kunden anlegen & verwalten (coming soon)
              </p>
            </div>
            <GradientButton onClick={handleLogout} icon={LogOut}>
              Logout
            </GradientButton>
          </div>

          <GlassCard>
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-gradient-primary mx-auto mb-4 flex items-center justify-center">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Partner-Funktionen folgen</h2>
              <p className="text-muted-foreground">
                Kundenanlage, Tracking und Provisionen werden bald freigeschaltet
              </p>
            </div>
          </GlassCard>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default PartnerDashboard;
