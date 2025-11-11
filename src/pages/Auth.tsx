import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ClassicNav from "@/components/ClassicNav";
import Particles from "@/components/Particles";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, getUserRole } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { z } from "zod";
import { LogIn } from "lucide-react";
import { motion } from "framer-motion";
import qraitLogo from '@/assets/qrait-logo-full.png';

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

  const navItems = [
    { label: 'Home', href: '/' },
    { label: 'Kontakt', href: '/kontakt' },
    { label: 'Datenschutz', href: '/datenschutz' },
    { label: 'Impressum', href: '/impressum' },
    { label: 'Login', href: '/auth' }
  ];

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user && role) {
      if (role === 'admin') navigate('/admin');
      else if (role === 'merchant') navigate('/merchant');
      else if (role === 'partner') navigate('/partner');
      else if (role === 'customer') navigate('/customer');
    }
  }, [user, role, loading, navigate]);

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
      const userRole = await getUserRole(data.user.id);
      setIsLoading(false);
      toast.success("Erfolgreich angemeldet");
      
      if (userRole === 'admin') {
        navigate('/admin');
      } else if (userRole === 'merchant') {
        navigate('/merchant');
      } else if (userRole === 'partner') {
        navigate('/partner');
      } else if (userRole === 'customer') {
        navigate('/customer');
      } else {
        navigate('/');
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
        logo={<img src={qraitLogo} alt="QRait Logo" className="h-10 w-auto" />}
      />

      <div className="pt-32 pb-20 px-4 flex items-center justify-center min-h-screen">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <img src={qraitLogo} alt="QRait Logo" className="h-16 w-auto mx-auto mb-4" />
            <h1 className="text-3xl font-bold">
              Anmelden
            </h1>
            <p className="text-muted-foreground mt-2">Zugang zu Ihrem Dashboard</p>
          </div>

          <Card className="p-6 border-border">
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
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Zugang nur für registrierte Benutzer
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
