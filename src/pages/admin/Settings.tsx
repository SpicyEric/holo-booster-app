import { useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, Lock, Mail } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const Settings = () => {
  const { user } = useAuth();
  const [changingPassword, setChangingPassword] = useState(false);
  const [changingEmail, setChangingEmail] = useState(false);
  
  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  
  const [emailData, setEmailData] = useState({
    newEmail: "",
  });

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Passwörter stimmen nicht überein");
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      toast.error("Passwort muss mindestens 6 Zeichen lang sein");
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) throw error;

      toast.success("Passwort erfolgreich geändert");
      setPasswordData({ newPassword: "", confirmPassword: "" });
    } catch (error: any) {
      toast.error(error.message || "Fehler beim Ändern des Passworts");
      console.error(error);
    } finally {
      setChangingPassword(false);
    }
  };

  const handleEmailChange = async () => {
    if (!emailData.newEmail || !emailData.newEmail.includes("@")) {
      toast.error("Bitte gib eine gültige E-Mail-Adresse ein");
      return;
    }

    setChangingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser({
        email: emailData.newEmail,
      });

      if (error) throw error;

      toast.success("Bestätigungsmail wurde an die neue Adresse gesendet");
      setEmailData({ newEmail: "" });
    } catch (error: any) {
      toast.error(error.message || "Fehler beim Ändern der E-Mail");
      console.error(error);
    } finally {
      setChangingEmail(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Einstellungen
        </h1>
        <p className="text-muted-foreground mt-1">Profil- und Kontoeinstellungen verwalten</p>
      </div>

      {/* Current Account Info */}
      <GlassCard>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <User className="w-5 h-5" />
          Aktuelles Konto
        </h2>
        <div className="space-y-3">
          <div className="p-4 bg-muted/30 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">E-Mail-Adresse</p>
            <p className="font-medium">{user?.email || "Nicht verfügbar"}</p>
          </div>
          <div className="p-4 bg-muted/30 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">User ID</p>
            <p className="font-mono text-sm">{user?.id || "Nicht verfügbar"}</p>
          </div>
          <div className="p-4 bg-muted/30 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Konto erstellt am</p>
            <p className="font-medium">
              {user?.created_at 
                ? new Date(user.created_at).toLocaleDateString('de-DE', {
                    day: '2-digit',
                    month: '2-digit', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : "Nicht verfügbar"}
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Change Email */}
      <GlassCard>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Mail className="w-5 h-5" />
          E-Mail-Adresse ändern
        </h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="current_email">Aktuelle E-Mail</Label>
            <Input
              id="current_email"
              type="email"
              value={user?.email || ""}
              disabled
              className="bg-muted/50"
            />
          </div>
          <div>
            <Label htmlFor="new_email">Neue E-Mail-Adresse</Label>
            <Input
              id="new_email"
              type="email"
              value={emailData.newEmail}
              onChange={(e) => setEmailData({ newEmail: e.target.value })}
              placeholder="neue-email@beispiel.de"
            />
          </div>
          <Button 
            onClick={handleEmailChange} 
            disabled={changingEmail || !emailData.newEmail}
          >
            {changingEmail ? "Wird geändert..." : "E-Mail ändern"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Nach der Änderung erhältst du eine Bestätigungsmail an die neue Adresse.
          </p>
        </div>
      </GlassCard>

      {/* Change Password */}
      <GlassCard>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Lock className="w-5 h-5" />
          Passwort ändern
        </h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="new_password">Neues Passwort</Label>
            <Input
              id="new_password"
              type="password"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              placeholder="Mindestens 6 Zeichen"
            />
          </div>
          <div>
            <Label htmlFor="confirm_password">Passwort bestätigen</Label>
            <Input
              id="confirm_password"
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
              placeholder="Passwort wiederholen"
            />
          </div>
          <Button 
            onClick={handlePasswordChange} 
            disabled={changingPassword || !passwordData.newPassword || !passwordData.confirmPassword}
          >
            {changingPassword ? "Wird geändert..." : "Passwort ändern"}
          </Button>
        </div>
      </GlassCard>
    </div>
  );
};

export default Settings;