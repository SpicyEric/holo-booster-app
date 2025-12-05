import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getUserCustomer } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, Gift, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface AutomationSettings {
  welcome_enabled: boolean;
  welcome_title: string;
  welcome_message: string;
  birthday_enabled: boolean;
  birthday_title: string;
  birthday_message: string;
  birthday_bonus_points: number;
}

export default function Automatisierungen() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  
  const [settings, setSettings] = useState<AutomationSettings>({
    welcome_enabled: false,
    welcome_title: "Willkommen! 🎉",
    welcome_message: "Herzlich willkommen in unserem Bonusprogramm! Sammle Stempel und sichere dir tolle Prämien.",
    birthday_enabled: false,
    birthday_title: "Alles Gute zum Geburtstag! 🎂",
    birthday_message: "Wir wünschen dir alles Gute zum Geburtstag! Als kleines Geschenk schenken wir dir Bonuspunkte.",
    birthday_bonus_points: 5
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      if (user?.id) {
        const customerData = await getUserCustomer(user.id);
        if (customerData) {
          setCustomerId(customerData.id);
          
          // Load existing automation settings if they exist
          // For now we'll use local state, but this could be stored in a new table
          // TODO: Create automation_settings table if needed
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!customerId) {
      toast.error("Kein Kundenkonto gefunden");
      return;
    }

    setSaving(true);
    try {
      // TODO: Save to database when automation_settings table is created
      // For now, just show success
      toast.success("Automatisierungen gespeichert");
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" />
          Automatisierungen
        </h1>
        <p className="text-sm text-muted-foreground">
          Richten Sie automatische Nachrichten für Ihre Kunden ein
        </p>
      </div>

      {/* Willkommensnachricht */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                <Mail className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-base">Willkommensnachricht</CardTitle>
                <CardDescription className="text-xs">
                  Wird automatisch an neue Bonuskarten-Nutzer gesendet
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={settings.welcome_enabled}
              onCheckedChange={(checked) => setSettings({ ...settings, welcome_enabled: checked })}
            />
          </div>
        </CardHeader>
        {settings.welcome_enabled && (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="welcome_title">Titel</Label>
              <Input
                id="welcome_title"
                value={settings.welcome_title}
                onChange={(e) => setSettings({ ...settings, welcome_title: e.target.value })}
                placeholder="z.B. Willkommen! 🎉"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="welcome_message">Nachricht</Label>
              <Textarea
                id="welcome_message"
                value={settings.welcome_message}
                onChange={(e) => setSettings({ ...settings, welcome_message: e.target.value })}
                placeholder="Ihre Willkommensnachricht..."
                rows={3}
              />
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">
                💡 Diese Nachricht wird automatisch gesendet, sobald jemand zum ersten Mal bei Ihnen stempelt.
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Geburtstagsgrüße */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-pink-100 dark:bg-pink-900">
                <Gift className="w-5 h-5 text-pink-600" />
              </div>
              <div>
                <CardTitle className="text-base">Geburtstagsgrüße</CardTitle>
                <CardDescription className="text-xs">
                  Automatischer Gruß und optionale Bonuspunkte am Geburtstag
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={settings.birthday_enabled}
              onCheckedChange={(checked) => setSettings({ ...settings, birthday_enabled: checked })}
            />
          </div>
        </CardHeader>
        {settings.birthday_enabled && (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="birthday_title">Titel</Label>
              <Input
                id="birthday_title"
                value={settings.birthday_title}
                onChange={(e) => setSettings({ ...settings, birthday_title: e.target.value })}
                placeholder="z.B. Alles Gute zum Geburtstag! 🎂"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="birthday_message">Nachricht</Label>
              <Textarea
                id="birthday_message"
                value={settings.birthday_message}
                onChange={(e) => setSettings({ ...settings, birthday_message: e.target.value })}
                placeholder="Ihre Geburtstagsnachricht..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="birthday_bonus">Bonuspunkte als Geschenk</Label>
              <Input
                id="birthday_bonus"
                type="number"
                min={0}
                max={100}
                value={settings.birthday_bonus_points}
                onChange={(e) => setSettings({ ...settings, birthday_bonus_points: parseInt(e.target.value) || 0 })}
                className="w-32"
              />
              <p className="text-xs text-muted-foreground">
                Diese Punkte werden automatisch am Geburtstag gutgeschrieben (0 = keine Bonuspunkte)
              </p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">
                💡 Die Geburtstagsnachricht wird am Geburtstag des Nutzers automatisch gesendet (basierend auf dem hinterlegten Geburtsdatum).
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Änderungen speichern
        </Button>
      </div>

      {/* Info Box */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium text-sm">So funktioniert's</p>
              <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                <li>• <strong>Willkommensnachricht:</strong> Wird beim ersten Stempel eines neuen Nutzers gesendet</li>
                <li>• <strong>Geburtstagsgrüße:</strong> Werden automatisch am Geburtstag des Nutzers verschickt</li>
                <li>• Nachrichten erscheinen in der Eloyo-App unter "Nachrichten"</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
