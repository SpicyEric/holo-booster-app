import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ClassicNav from "@/components/ClassicNav";
import Particles from "@/components/Particles";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, signOut, deriveUserRole, UserRole } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { z } from "zod";
import { LogIn, LogOut } from "lucide-react";
import { motion } from "framer-motion";
import eloyoLogo from '@/assets/eloyo-logo.png';
import { supabase } from "@/integrations/supabase/client";

const loginSchema = z.object({
  email: z.string().email("Ungültige E-Mail-Adresse"),
  password: z.string().min(6, "Passwort muss mindestens 6 Zeichen lang sein"),
});

const Auth = () => {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isResetMode, setIsResetMode] = useState(false);
  const location = useLocation();
  const navItems = [
    { label: 'Home', href: '/' },
    { label: 'Kontakt', href: '/kontakt' },
    { label: 'Datenschutz', href: '/datenschutz' },
    { label: 'Impressum', href: '/impressum' },
    { label: 'Login', href: '/auth' }
  ];

  // Detect Supabase auth callbacks and enable password set mode
  useEffect(() => {
    const hash = window.location.hash || location.hash || "";
    if (hash.includes("type=recovery") || hash.includes("type=signup")) {
      setIsResetMode(true);
    }
  }, [location.hash]);

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user && role && !isResetMode) {
      redirectByRole(role);
    }
  }, [user, role, loading, isResetMode, navigate]);

  // Helper: Redirect basierend auf Rolle
  const redirectByRole = (userRole: UserRole) => {
    if (userRole === 'admin') {
      navigate('/admin');
    } else if (userRole === 'merchant') {
      navigate('/kunde');
    } else if (userRole === 'partner') {
      navigate('/partner/dashboard');
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("Passwort muss mindestens 6 Zeichen lang sein");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwörter stimmen nicht überein");
      return;
    }
    setIsLoading(true);
    
    // Passwort über Lovable Cloud setzen
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setIsLoading(false);
      toast.error("Passwort konnte nicht gesetzt werden: " + error.message);
      return;
    }
    
    toast.success("Passwort erfolgreich gesetzt");
    const { data: userData } = await supabase.auth.getUser();
    const authedUser = userData?.user;
    if (authedUser) {
      const userRole = await deriveUserRole(authedUser.id, authedUser.email);
      console.log('[handleSetPassword] Derived role:', userRole);
      setIsLoading(false);
      if (userRole) {
        redirectByRole(userRole);
      } else {
        toast.error("Ihr Konto ist noch nicht freigeschaltet. Bitte laden Sie die Seite in 30 Sekunden neu oder kontaktieren Sie den Support.");
      }
    } else {
      setIsLoading(false);
      navigate('/auth');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = loginSchema.safeParse({ email: loginEmail, password: loginPassword });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsLoading(true);
    const { data, error } = await signIn(loginEmail, loginPassword);
    
    if (error) {
      setIsLoading(false);
      if (error.message.includes('Invalid')) {
        toast.error("Ungültige Anmeldedaten");
      } else {
        toast.error("Login fehlgeschlagen: " + error.message);
      }
    } else if (data?.user) {
      // Get user role and redirect to appropriate dashboard
      const userRole = await deriveUserRole(data.user.id, data.user.email);
      console.log('[handleLogin] Derived role:', userRole);
      setIsLoading(false);
      
      if (userRole) {
        toast.success("Erfolgreich angemeldet");
        redirectByRole(userRole);
      } else {
        toast.error("Ihr Konto ist noch nicht freigeschaltet oder Sie haben keinen Zugang zur Website. Bei Fragen kontaktieren Sie den Support.");
      }
    } else {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-gradient-primary animate-pulse" />
      </div>
    );
  }

  return (
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
      
      <ClassicNav 
        items={navItems}
        logo={<img src={eloyoLogo} alt="Eloyo Logo" className="h-10 w-auto" />}
      />

      <div className="pt-32 pb-20 px-4 flex items-center justify-center min-h-screen">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <img src={eloyoLogo} alt="Eloyo Logo" className="h-16 w-auto mx-auto mb-4" />
            <h1 className="text-3xl font-bold">
              {isResetMode ? 'Passwort festlegen' : 'Anmelden'}
            </h1>
            <p className="text-muted-foreground mt-2">{isResetMode ? 'Bitte neues Passwort wählen' : 'Zugang zu Ihrem Dashboard'}</p>
          </div>

          <Card className="p-6 border-border">
            {isResetMode ? (
              <form onSubmit={handleSetPassword} className="space-y-4">
                <div>
                  <Label htmlFor="new-password">Neues Passwort</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="confirm-password">Passwort bestätigen</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="mt-2"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-foreground text-background hover:bg-foreground/90"
                  disabled={isLoading}
                >
                  {isLoading ? 'Speichern...' : 'Passwort festlegen'}
                </Button>
              </form>
            ) : user && role ? (
              <div className="space-y-4 text-center">
                <p className="text-muted-foreground">
                  Sie sind angemeldet als <strong>{user.email}</strong>
                </p>
                <Button
                  onClick={async () => {
                    setIsLoading(true);
                    await signOut();
                    setIsLoading(false);
                    toast.success("Erfolgreich abgemeldet");
                    window.location.reload();
                  }}
                  variant="outline"
                  className="w-full"
                  disabled={isLoading}
                >
                  <LogOut className="mr-2 w-4 h-4" />
                  {isLoading ? 'Abmeldung...' : 'Abmelden'}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="login-email">E-Mail</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="name@firma.de"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label htmlFor="login-password">Passwort</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    className="mt-2"
                  />
                </div>
    
                <Button
                  type="submit"
                  className="w-full bg-foreground text-background hover:bg-foreground/90"
                  disabled={isLoading}
                >
                  <LogIn className="mr-2 w-4 h-4" />
                  {isLoading ? 'Anmeldung...' : 'Anmelden'}
                </Button>
              </form>
            )}
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Zugang nur für registrierte Geschäftskunden
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
