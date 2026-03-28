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
import { Loader2, Upload, Download, FileText, AlertTriangle, Eye, EyeOff, Lock, User, Building, FileCheck } from "lucide-react";

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
  contract_file_path: string | null;
  contract_uploaded_at: string | null;
  contract_status: string;
  contract_deadline: string | null;
}

export default function SalesRepSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<SalesRepProfile | null>(null);
  const [uploading, setUploading] = useState(false);

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
      if (data) setProfile(data as unknown as SalesRepProfile);
    } catch (err: any) {
      console.error('Error loading profile:', err);
      toast.error('Fehler beim Laden des Profils');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (fields: Partial<SalesRepProfile>) => {
    if (!profile) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('sales_rep_profiles')
        .update(fields as any)
        .eq('user_id', user!.id);

      if (error) throw error;
      setProfile(prev => prev ? { ...prev, ...fields } : prev);
      toast.success('Änderungen gespeichert');
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

  const handleContractUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const filePath = `${user.id}/vertrag_${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('sales-rep-contracts')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from('sales_rep_profiles')
        .update({
          contract_file_path: filePath,
          contract_uploaded_at: new Date().toISOString(),
          contract_status: 'submitted',
        } as any)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setProfile(prev => prev ? {
        ...prev,
        contract_file_path: filePath,
        contract_uploaded_at: new Date().toISOString(),
        contract_status: 'submitted',
      } : prev);

      toast.success('Vertrag erfolgreich hochgeladen');
    } catch (err: any) {
      toast.error(err.message || 'Fehler beim Hochladen');
    } finally {
      setUploading(false);
    }
  };

  const handleContractDownload = async () => {
    if (!profile?.contract_file_path) return;
    try {
      const { data, error } = await supabase.storage
        .from('sales-rep-contracts')
        .createSignedUrl(profile.contract_file_path, 60);

      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (err: any) {
      toast.error('Fehler beim Download');
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

  const contractDaysLeft = profile.contract_deadline
    ? Math.max(0, Math.ceil((new Date(profile.contract_deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

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
            <span className="hidden sm:inline">Steuern & Vertrag</span>
          </TabsTrigger>
        </TabsList>

        {/* KONTOEINSTELLUNGEN */}
        <TabsContent value="account">
          <GlassCard>
            <div className="p-6 space-y-6">
              <h2 className="text-lg font-semibold">Kontoeinstellungen</h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Mitarbeiternummer</Label>
                  <div className="p-3 rounded-md bg-muted text-muted-foreground font-mono">
                    #{profile.employee_number || '—'}
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
                Ohne hinterlegte Bankverbindung bist du nicht vergütungsberechtigt.
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

        {/* STEUERN & VERTRAG */}
        <TabsContent value="tax">
          <div className="space-y-6">
            <GlassCard>
              <div className="p-6 space-y-6">
                <h2 className="text-lg font-semibold">Steuerangaben</h2>
                <p className="text-sm text-muted-foreground">
                  Ohne Steuernummer bist du nicht vergütungsberechtigt.
                </p>

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
                  onClick={() => handleSave({
                    tax_number: profile.tax_number,
                    vat_id: profile.vat_id,
                    is_small_business: profile.is_small_business,
                  })}
                  disabled={saving}
                  className="w-full"
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Steuerangaben speichern
                </Button>
              </div>
            </GlassCard>

            <GlassCard>
              <div className="p-6 space-y-6">
                <h2 className="text-lg font-semibold">Vertriebspartnervertrag</h2>

                {profile.contract_status === 'pending' && contractDaysLeft !== null && (
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                    <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-destructive">Vertrag nicht eingereicht</p>
                      <p className="text-sm text-destructive/80">
                        Bitte lade deinen unterschriebenen Vertrag innerhalb von {contractDaysLeft} Tagen hoch. 
                        Andernfalls wird dein Account automatisch gelöscht.
                      </p>
                    </div>
                  </div>
                )}

                {profile.contract_status === 'submitted' && (
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/10 border border-primary/20">
                    <FileCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-primary">Vertrag eingereicht</p>
                      <p className="text-sm text-muted-foreground">
                        Dein Vertrag wurde am {profile.contract_uploaded_at ? new Date(profile.contract_uploaded_at).toLocaleDateString('de-DE') : '—'} hochgeladen und wird geprüft.
                      </p>
                    </div>
                  </div>
                )}

                {profile.contract_status === 'approved' && (
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                    <FileCheck className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-600">Vertrag genehmigt</p>
                      <p className="text-sm text-muted-foreground">Dein Vertrag wurde geprüft und genehmigt.</p>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  {/* TODO: Link to contract template PDF */}
                  <Button variant="outline" className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Vertragsvorlage herunterladen
                  </Button>

                  <div className="relative">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleContractUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      disabled={uploading}
                    />
                    <Button variant="default" className="flex items-center gap-2 pointer-events-none">
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      Unterschriebenen Vertrag hochladen
                    </Button>
                  </div>
                </div>

                {profile.contract_file_path && (
                  <Button variant="ghost" size="sm" onClick={handleContractDownload} className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Hochgeladenen Vertrag ansehen
                  </Button>
                )}
              </div>
            </GlassCard>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
