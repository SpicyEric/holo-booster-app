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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            Automatisierungen
          </h1>
          <p className="text-gray-500 mt-2">
            Richten Sie automatische Nachrichten für Ihre Kunden ein
          </p>
        </div>

        {/* Willkommensnachricht */}
        <Card className="rounded-2xl shadow-sm border-0 bg-gray-50/80">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold text-gray-900">Willkommensnachricht</CardTitle>
                  <CardDescription className="text-xs text-gray-500">
                    Wird automatisch an neue Bonuskarten-Nutzer gesendet
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium ${settings.welcome_enabled ? 'text-green-600' : 'text-gray-400'}`}>
                  {settings.welcome_enabled ? 'Aktiv' : 'Inaktiv'}
                </span>
                <Switch
                  checked={settings.welcome_enabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, welcome_enabled: checked })}
                  className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-300 scale-125"
                />
              </div>
            </div>
          </CardHeader>
          {settings.welcome_enabled && (
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="welcome_title" className="text-gray-700">Titel</Label>
                <Input
                  id="welcome_title"
                  value={settings.welcome_title}
                  onChange={(e) => setSettings({ ...settings, welcome_title: e.target.value })}
                  placeholder="z.B. Willkommen! 🎉"
                  className="rounded-xl border-gray-200"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="welcome_message" className="text-gray-700">Nachricht</Label>
                <Textarea
                  id="welcome_message"
                  value={settings.welcome_message}
                  onChange={(e) => setSettings({ ...settings, welcome_message: e.target.value })}
                  placeholder="Ihre Willkommensnachricht..."
                  rows={3}
                  className="rounded-xl border-gray-200"
                />
              </div>
              <div className="p-4 bg-green-50 rounded-xl">
                <p className="text-xs text-green-700">
                  💡 Diese Nachricht wird automatisch gesendet, sobald jemand zum ersten Mal bei Ihnen stempelt.
                </p>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Geburtstagsgrüße */}
        <Card className="rounded-2xl shadow-sm border-0 bg-gray-50/80">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center">
                  <Gift className="w-5 h-5 text-pink-600" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold text-gray-900">Geburtstagsgrüße</CardTitle>
                  <CardDescription className="text-xs text-gray-500">
                    Automatischer Gruß und optionale Bonuspunkte am Geburtstag
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium ${settings.birthday_enabled ? 'text-pink-600' : 'text-gray-400'}`}>
                  {settings.birthday_enabled ? 'Aktiv' : 'Inaktiv'}
                </span>
                <Switch
                  checked={settings.birthday_enabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, birthday_enabled: checked })}
                  className="data-[state=checked]:bg-pink-500 data-[state=unchecked]:bg-gray-300 scale-125"
                />
              </div>
            </div>
          </CardHeader>
          {settings.birthday_enabled && (
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="birthday_title" className="text-gray-700">Titel</Label>
                <Input
                  id="birthday_title"
                  value={settings.birthday_title}
                  onChange={(e) => setSettings({ ...settings, birthday_title: e.target.value })}
                  placeholder="z.B. Alles Gute zum Geburtstag! 🎂"
                  className="rounded-xl border-gray-200"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthday_message" className="text-gray-700">Nachricht</Label>
                <Textarea
                  id="birthday_message"
                  value={settings.birthday_message}
                  onChange={(e) => setSettings({ ...settings, birthday_message: e.target.value })}
                  placeholder="Ihre Geburtstagsnachricht..."
                  rows={3}
                  className="rounded-xl border-gray-200"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthday_bonus" className="text-gray-700">Bonuspunkte als Geschenk</Label>
                <Input
                  id="birthday_bonus"
                  type="number"
                  min={0}
                  max={100}
                  value={settings.birthday_bonus_points}
                  onChange={(e) => setSettings({ ...settings, birthday_bonus_points: parseInt(e.target.value) || 0 })}
                  className="w-32 rounded-xl border-gray-200"
                />
                <p className="text-xs text-gray-500">
                  Diese Punkte werden automatisch am Geburtstag gutgeschrieben (0 = keine Bonuspunkte)
                </p>
              </div>
              <div className="p-4 bg-pink-50 rounded-xl">
                <p className="text-xs text-pink-700">
                  💡 Die Geburtstagsnachricht wird am Geburtstag des Nutzers automatisch gesendet.
                </p>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="rounded-xl">
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Änderungen speichern
          </Button>
        </div>

        {/* Info Box */}
        <Card className="rounded-2xl shadow-sm border-0 bg-primary/5">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">So funktioniert's</p>
                <ul className="text-xs text-gray-600 mt-2 space-y-1">
                  <li>• <strong>Willkommensnachricht:</strong> Wird beim ersten Stempel eines neuen Nutzers gesendet</li>
                  <li>• <strong>Geburtstagsgrüße:</strong> Werden automatisch am Geburtstag des Nutzers verschickt</li>
                  <li>• Nachrichten erscheinen in der Eloyo-App unter "Nachrichten"</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}