import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GlassCard } from "@/components/GlassCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Loader2, Eye, EyeOff, Lock, User, Building, FileCheck, CheckCircle2, XCircle, Info } from "lucide-react";

interface SalesRepProfile {
  id: string;
  user_id: string;
  employee_number: number | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  street: string;
  house_number: string;
  postal_code: string;
  city: string;
  country: string;
  tax_number: string;
  vat_id: string;
  iban: string;
  bic: string;
  bank_name: string;
  account_holder: string;
  is_small_business: boolean;
  vertrag_angenommen_am: string | null;
  vertrag_outdated: boolean;
}

// Fields that trigger vertrag_outdated when changed
const CONTRACT_SENSITIVE_FIELDS = ["first_name", "last_name", "street", "house_number", "postal_code", "city", "tax_number", "vat_id", "iban", "bic"] as const;

export default function SalesRepSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<SalesRepProfile | null>(null);
  const [originalProfile, setOriginalProfile] = useState<SalesRepProfile | null>(null);
  const [vatValidating, setVatValidating] = useState(false);
  const [vatResult, setVatResult] = useState<{ valid: boolean; name?: string; message?: string } | null>(null);

  // Password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  useEffect(() => {
    if (user) loadProfile();
  }, [user]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('sales_rep_profiles')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        const p = data as unknown as SalesRepProfile;
        setProfile(p);
        setOriginalProfile(p);
      }
    } catch (err: any) {
      console.error('Error loading profile:', err);
      toast.error('Fehler beim Laden des Profils');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (fields: Partial<SalesRepProfile>) => {
    if (!profile || !originalProfile) return;
    setSaving(true);
    try {
      // Check if any contract-sensitive field changed
      let outdated = false;
      if (profile.vertrag_angenommen_am) {
        for (const key of CONTRACT_SENSITIVE_FIELDS) {
          if (key in fields && (fields as any)[key] !== (originalProfile as any)[key]) {
            outdated = true;
            break;
          }
        }
      }

      const updateFields: any = { ...fields };
      if (outdated) {
        updateFields.vertrag_outdated = true;
      }

      const { error } = await supabase
        .from('sales_rep_profiles')
        .update(updateFields)
        .eq('user_id', user!.id);

      if (error) throw error;
      const updated = { ...profile, ...updateFields };
      setProfile(updated);
      setOriginalProfile(updated);
      toast.success('Änderungen gespeichert');

      if (outdated) {
        toast.warning('Deine Profildaten haben sich geändert. Bitte nimm den aktualisierten Vertrag erneut an.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword.length < 6) {
      toast.error('Passwort muss mindestens 6 Zeichen haben');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwörter stimmen nicht überein');
      return;
    }
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Passwort erfolgreich geändert');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Fehler beim Ändern des Passworts');
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Kein Vertriebsprofil gefunden.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Einstellungen</h1>

      <Tabs defaultValue="account" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="account" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Konto</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            <span className="hidden sm:inline">Sicherheit</span>
          </TabsTrigger>
          <TabsTrigger value="bank" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            <span className="hidden sm:inline">Bank</span>
          </TabsTrigger>
          <TabsTrigger value="tax" className="flex items-center gap-2">
            <FileCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Steuern</span>
          </TabsTrigger>
        </TabsList>

        {/* KONTOEINSTELLUNGEN */}
        <TabsContent value="account">
          <GlassCard>
            <div className="p-6 space-y-6">
              <h2 className="text-lg font-semibold">Kontoeinstellungen</h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Partner-ID</Label>
                  <div className="p-3 rounded-md bg-muted text-muted-foreground font-mono">
                    PID-{profile.employee_number || '—'}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>E-Mail</Label>
                  <div className="p-3 rounded-md bg-muted text-muted-foreground">
                    {profile.email}
                  </div>
                  <p className="text-xs text-muted-foreground">E-Mail-Änderungen nur über den Admin möglich.</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Vorname</Label>
                  <Input
                    value={profile.first_name}
                    onChange={(e) => setProfile(prev => prev ? { ...prev, first_name: e.target.value } : prev)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nachname</Label>
                  <Input
                    value={profile.last_name}
                    onChange={(e) => setProfile(prev => prev ? { ...prev, last_name: e.target.value } : prev)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Telefon</Label>
                <Input
                  value={profile.phone}
                  onChange={(e) => setProfile(prev => prev ? { ...prev, phone: e.target.value } : prev)}
                />
              </div>

              <h3 className="text-md font-semibold pt-4">Wohnanschrift</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Straße</Label>
                  <Input
                    value={profile.street}
                    onChange={(e) => setProfile(prev => prev ? { ...prev, street: e.target.value } : prev)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hausnummer</Label>
                  <Input
                    value={profile.house_number}
                    onChange={(e) => setProfile(prev => prev ? { ...prev, house_number: e.target.value } : prev)}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>PLZ</Label>
                  <Input
                    value={profile.postal_code}
                    onChange={(e) => setProfile(prev => prev ? { ...prev, postal_code: e.target.value } : prev)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Stadt</Label>
                  <Input
                    value={profile.city}
                    onChange={(e) => setProfile(prev => prev ? { ...prev, city: e.target.value } : prev)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Land</Label>
                  <Input
                    value={profile.country}
                    onChange={(e) => setProfile(prev => prev ? { ...prev, country: e.target.value } : prev)}
                  />
                </div>
              </div>

              <Button
                onClick={() => handleSave({
                  first_name: profile.first_name,
                  last_name: profile.last_name,
                  phone: profile.phone,
                  street: profile.street,
                  house_number: profile.house_number,
                  postal_code: profile.postal_code,
                  city: profile.city,
                  country: profile.country,
                })}
                disabled={saving}
                className="w-full"
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Änderungen speichern
              </Button>
            </div>
          </GlassCard>
        </TabsContent>

        {/* SICHERHEITSEINSTELLUNGEN */}
        <TabsContent value="security">
          <GlassCard>
            <div className="p-6 space-y-6">
              <h2 className="text-lg font-semibold">Sicherheitseinstellungen</h2>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Neues Passwort</Label>
                  <div className="relative">
                    <Input
                      type={showPasswords ? 'text' : 'password'}
                      placeholder="Mindestens 6 Zeichen"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(!showPasswords)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Passwort bestätigen</Label>
                  <Input
                    type={showPasswords ? 'text' : 'password'}
                    placeholder="Passwort wiederholen"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <Button onClick={handlePasswordChange} disabled={changingPassword}>
                  {changingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Passwort ändern
                </Button>
              </div>
            </div>
          </GlassCard>
        </TabsContent>

        {/* BANKVERBINDUNG */}
        <TabsContent value="bank">
          <GlassCard>
            <div className="p-6 space-y-6">
              <h2 className="text-lg font-semibold">Bankverbindung</h2>
              <p className="text-sm text-muted-foreground">
                Ohne hinterlegte Bankverbindung ist keine Auszahlung möglich. Provisionen verfallen ersatzlos.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Kontoinhaber</Label>
                  <Input
                    value={profile.account_holder}
                    onChange={(e) => setProfile(prev => prev ? { ...prev, account_holder: e.target.value } : prev)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bankname</Label>
                  <Input
                    value={profile.bank_name}
                    onChange={(e) => setProfile(prev => prev ? { ...prev, bank_name: e.target.value } : prev)}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>IBAN</Label>
                  <Input
                    value={profile.iban}
                    placeholder="DE..."
                    onChange={(e) => setProfile(prev => prev ? { ...prev, iban: e.target.value } : prev)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>BIC</Label>
                  <Input
                    value={profile.bic}
                    onChange={(e) => setProfile(prev => prev ? { ...prev, bic: e.target.value } : prev)}
                  />
                </div>
              </div>

              <Button
                onClick={() => handleSave({
                  account_holder: profile.account_holder,
                  bank_name: profile.bank_name,
                  iban: profile.iban,
                  bic: profile.bic,
                })}
                disabled={saving}
                className="w-full"
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Bankverbindung speichern
              </Button>
            </div>
          </GlassCard>
        </TabsContent>

        {/* STEUERN */}
        <TabsContent value="tax">
          <GlassCard>
            <div className="p-6 space-y-6">
              <h2 className="text-lg font-semibold">Steuerangaben</h2>

              {/* Info box */}
              <div className="bg-muted/60 border border-border rounded-lg p-4 space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                  <p className="font-medium text-foreground">Hinweis: Dies ist keine Rechtsberatung. Bitte informiere dich selbst oder bei einem Steuerberater über deine steuerliche Situation.</p>
                </div>
                <p>
                  <strong>Kleinunternehmerregelung (§ 19 UStG):</strong> Wenn dein Jahresumsatz unter 22.000 € liegt, kannst du die Kleinunternehmerregelung nutzen. In diesem Fall benötigst du nur eine Steuernummer, keine USt-IdNr. Deine Provisionen werden netto ausgezahlt — ohne MwSt.-Aufschlag.
                </p>
                <p>
                  <strong>USt-pflichtig:</strong> Wenn du eine gültige USt-IdNr. hinterlegst und diese bestätigt wird, werden deine Provisionen brutto (zzgl. 19% MwSt.) ausgezahlt. Deine Gutschriften werden entsprechend ausgestellt.
                </p>
                <p className="font-medium text-destructive">
                  Wichtig: Ohne hinterlegte Steuernummer ist keine Auszahlung möglich. Provisionen die in einem Monat anfallen, in dem keine Steuernummer vorliegt, verfallen ersatzlos.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Steuernummer</Label>
                  <Input
                    value={profile.tax_number}
                    onChange={(e) => setProfile(prev => prev ? { ...prev, tax_number: e.target.value } : prev)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>USt-IdNr. (optional)</Label>
                  <Input
                    value={profile.vat_id}
                    placeholder="DE..."
                    onChange={(e) => setProfile(prev => prev ? { ...prev, vat_id: e.target.value } : prev)}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  checked={profile.is_small_business}
                  onCheckedChange={(checked) => setProfile(prev => prev ? { ...prev, is_small_business: checked } : prev)}
                />
                <Label>Kleinunternehmerregelung (§19 UStG)</Label>
              </div>

              <Button
                onClick={async () => {
                  // Validate VAT ID via VIES if provided
                  if (profile.vat_id && profile.vat_id.trim().length > 0) {
                    setVatValidating(true);
                    setVatResult(null);
                    try {
                      const { data: sessionData } = await supabase.auth.getSession();
                      const token = sessionData?.session?.access_token;
                      const res = await supabase.functions.invoke('validate-ust-id', {
                        body: { vat_id: profile.vat_id },
                        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                      });
                      if (res.error) throw new Error(res.error.message || 'Validierungsfehler');
                      const result = res.data;
                      if (result.error) {
                        setVatResult({ valid: false, message: result.error });
                        setVatValidating(false);
                        return; // Don't save if invalid
                      }
                      setVatResult(result);
                      if (!result.valid) {
                        setVatValidating(false);
                        return; // Don't save if invalid
                      }
                    } catch (err: any) {
                      setVatResult({ valid: false, message: err.message || 'Validierung fehlgeschlagen' });
                      setVatValidating(false);
                      return;
                    } finally {
                      setVatValidating(false);
                    }
                  } else {
                    setVatResult(null);
                  }

                  await handleSave({
                    tax_number: profile.tax_number,
                    vat_id: profile.vat_id,
                    is_small_business: profile.is_small_business,
                  });
                }}
                disabled={saving || vatValidating}
                className="w-full"
              >
                {(saving || vatValidating) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {vatValidating ? 'USt-IdNr. wird geprüft…' : 'Steuerangaben speichern'}
              </Button>

              {vatResult && (
                <div className={`flex items-start gap-2 p-3 rounded-md text-sm ${
                  vatResult.valid 
                    ? 'bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20' 
                    : 'bg-destructive/10 text-destructive border border-destructive/20'
                }`}>
                  {vatResult.valid ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  )}
                  <div>
                    {vatResult.valid ? (
                      <>
                        <p className="font-medium">USt-IdNr. bestätigt</p>
                        {vatResult.name && <p>Gefunden: {vatResult.name}</p>}
                      </>
                    ) : (
                      <p>{vatResult.message || 'Diese USt-IdNr. ist laut EU-Register ungültig. Bitte prüfe die Nummer.'}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </GlassCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
