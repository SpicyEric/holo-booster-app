import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GlassCard } from "@/components/GlassCard";
import { GradientButton } from "@/components/GradientButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { signIn, signUp } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { z } from "zod";
import { LogIn, UserPlus } from "lucide-react";
import { motion } from "framer-motion";

const loginSchema = z.object({
  email: z.string().email("Ungültige E-Mail-Adresse"),
  password: z.string().min(6, "Passwort muss mindestens 6 Zeichen lang sein"),
});

const signupSchema = loginSchema.extend({
  fullName: z.string().min(2, "Name muss mindestens 2 Zeichen lang sein"),
});

const Auth = () => {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user && role) {
      if (role === 'admin') navigate('/admin');
      else if (role === 'merchant') navigate('/merchant');
      else if (role === 'partner') navigate('/partner');
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
    const { error } = await signIn(loginEmail, loginPassword);
    setIsLoading(false);

    if (error) {
      if (error.message.includes('Invalid')) {
        toast.error("Ungültige Anmeldedaten");
      } else {
        toast.error("Login fehlgeschlagen: " + error.message);
      }
    } else {
      toast.success("Erfolgreich angemeldet");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = signupSchema.safeParse({ 
      email: signupEmail, 
      password: signupPassword,
      fullName: signupName 
    });
    
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsLoading(true);
    const { error } = await signUp(signupEmail, signupPassword, signupName);
    setIsLoading(false);

    if (error) {
      if (error.message.includes('already registered')) {
        toast.error("Diese E-Mail ist bereits registriert");
      } else {
        toast.error("Registrierung fehlgeschlagen: " + error.message);
      }
    } else {
      toast.success("Konto erstellt! Du kannst dich jetzt anmelden.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-gradient-primary animate-pulse-glow" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-gradient-primary animate-pulse-glow mx-auto mb-4" />
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Review Manager
          </h1>
        </div>

        <GlassCard>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Registrieren</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
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

                <GradientButton
                  type="submit"
                  className="w-full"
                  icon={LogIn}
                  disabled={isLoading}
                >
                  {isLoading ? 'Anmeldung...' : 'Anmelden'}
                </GradientButton>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <Label htmlFor="signup-name">Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Max Mustermann"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    required
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="signup-email">E-Mail</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="name@firma.de"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label htmlFor="signup-password">Passwort</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    required
                    className="mt-2"
                  />
                </div>

                <GradientButton
                  type="submit"
                  className="w-full"
                  icon={UserPlus}
                  disabled={isLoading}
                >
                  {isLoading ? 'Registrierung...' : 'Konto erstellen'}
                </GradientButton>
              </form>
            </TabsContent>
          </Tabs>
        </GlassCard>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Admin-Zugang: Registriere dich und kontaktiere den Support für Rollenzuweisung
        </p>
      </motion.div>
    </div>
  );
};

export default Auth;
