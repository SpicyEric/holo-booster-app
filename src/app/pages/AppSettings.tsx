import { useState, useEffect } from 'react';
import { MainLayout } from '@/app/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Eye, EyeOff, AlertTriangle, Pencil, Smartphone, Cake } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { addPhoneToAccount, verifyPhoneChange, normalizePhone } from '@/app/lib/phoneAuth';

export default function AppSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteTimer, setDeleteTimer] = useState(5);
  const [canDelete, setCanDelete] = useState(false);

  const [authMethod, setAuthMethod] = useState<'email' | 'phone' | 'both'>('email');

  // Password change state
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  // Email change state

  // Phone change state
  const [phoneDialogOpen, setPhoneDialogOpen] = useState(false);
  const [phoneStep, setPhoneStep] = useState<'enter' | 'verify'>('enter');
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneWorking, setPhoneWorking] = useState(false);

  const [birthDate, setBirthDate] = useState('');
  const [birthDateLocked, setBirthDateLocked] = useState(false);
  const [phoneChangedAt, setPhoneChangedAt] = useState<Date | null>(null);

  const userPhone = (user as any)?.phone as string | undefined;
  const userEmail = user?.email;

  const PHONE_COOLDOWN_DAYS = 90;
  const phoneNextChangeDate = phoneChangedAt
    ? new Date(phoneChangedAt.getTime() + PHONE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000)
    : null;
  const phoneLocked = !!(phoneNextChangeDate && phoneNextChangeDate.getTime() > Date.now());

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('birth_date, auth_method, phone_changed_at')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profileData) {
          const bd = profileData.birth_date || '';
          setBirthDate(bd);
          setBirthDateLocked(!!bd);
          if (profileData.auth_method) setAuthMethod(profileData.auth_method as any);
          const pca = (profileData as any).phone_changed_at;
          setPhoneChangedAt(pca ? new Date(pca) : null);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  // Delete timer
  useEffect(() => {
    if (deleteDialogOpen && deleteTimer > 0) {
      const timer = setTimeout(() => setDeleteTimer((p) => p - 1), 1000);
      return () => clearTimeout(timer);
    } else if (deleteTimer === 0) {
      setCanDelete(true);
    }
  }, [deleteDialogOpen, deleteTimer]);

  useEffect(() => {
    if (!deleteDialogOpen) { setDeleteTimer(5); setCanDelete(false); }
  }, [deleteDialogOpen]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Birth date is one-time only
      const payload: any = {};
      if (!birthDateLocked && birthDate) payload.birth_date = birthDate;

      if (Object.keys(payload).length === 0) {
        toast.info('Keine Änderungen');
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('user_id', user.id);
      if (error) throw error;

      if (payload.birth_date) setBirthDateLocked(true);
      toast.success('Geburtsdatum gespeichert. Es kann nicht mehr geändert werden.');
    } catch (error: any) {
      toast.error(`Fehler: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) { toast.error('Mindestens 6 Zeichen'); return; }
    if (newPassword !== confirmNewPassword) { toast.error('Passwörter stimmen nicht überein'); return; }
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Passwort erfolgreich geändert');
      setPasswordDialogOpen(false);
      setNewPassword(''); setConfirmNewPassword('');
    } catch (error: any) {
      toast.error(error.message || 'Fehler beim Ändern');
    } finally {
      setChangingPassword(false);
    }
  };

  // ===== Phone add/change =====
  const openPhoneDialog = () => {
    setPhoneInput(userPhone || '');
    setPhoneOtp('');
    setPhoneStep('enter');
    setPhoneDialogOpen(true);
  };

  const handleSendPhoneOtp = async () => {
    setPhoneWorking(true);
    try {
      await addPhoneToAccount(phoneInput);
      setPhoneInput(normalizePhone(phoneInput));
      setPhoneStep('verify');
      toast.success('SMS-Code gesendet');
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('registered')) {
        toast.error('Diese Nummer ist bereits vergeben');
      } else if (msg.toLowerCase().includes('phone') && msg.toLowerCase().includes('disabled')) {
        toast.error('SMS-Login ist noch nicht aktiviert.');
      } else {
        toast.error(msg || 'Fehler beim Senden');
      }
    } finally {
      setPhoneWorking(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (phoneOtp.length !== 4) return;
    setPhoneWorking(true);
    try {
      await verifyPhoneChange(phoneInput, phoneOtp);
      // Set/refresh 90-day cooldown
      const now = new Date();
      await supabase.from('profiles').update({ phone_changed_at: now.toISOString() }).eq('user_id', user!.id);
      setPhoneChangedAt(now);
      toast.success('Handynummer bestätigt. Du kannst sie für 90 Tage nicht erneut ändern.');
      setPhoneDialogOpen(false);
      await supabase.auth.refreshSession();
      setAuthMethod(userEmail ? 'both' : 'phone');
    } catch (err: any) {
      toast.error(err?.message || 'Ungültiger Code');
      setPhoneOtp('');
    } finally {
      setPhoneWorking(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('deleteUserAccount', {
        body: { userId: user.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      await supabase.auth.signOut();
      toast.success('Konto gelöscht');
      navigate('/app/auth');
    } catch (error: any) {
      toast.error(`Fehler beim Löschen: ${error.message}`);
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const formatBirthDate = (dateStr: string) => {
    if (!dateStr) return 'Nicht angegeben';
    try { return format(new Date(dateStr), 'dd. MMMM yyyy', { locale: de }); } catch { return dateStr; }
  };

  const showPasswordOption = authMethod === 'email' || authMethod === 'both' || !!userEmail;

  if (loading) {
    return (
      <MainLayout title="Mein Konto" showBack>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Mein Konto" showBack>
      <div className="space-y-6">
        {/* Persönliche Daten */}
        <Card>
          <CardHeader>
            <CardTitle>Persönliche Daten</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Cake className="h-4 w-4 text-primary" /> Geburtsdatum
              </Label>
              <Input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                disabled={birthDateLocked}
              />
              {birthDateLocked ? (
                <p className="text-xs text-muted-foreground">
                  Festgelegt: {formatBirthDate(birthDate)}. Das Geburtsdatum kann nicht mehr geändert werden.
                </p>
              ) : (
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                  ⚠️ Achtung: Dein Geburtsdatum kannst du nur einmal festlegen und danach nicht mehr ändern. Bitte sorgfältig eingeben.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Account */}
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Phone */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Smartphone className="h-4 w-4 text-primary" /> Handynummer
              </Label>
              {userPhone ? (
                <>
                  <div className="flex items-center gap-2">
                    <div className="p-3 rounded-md bg-muted text-muted-foreground flex-1">{userPhone}</div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={openPhoneDialog}
                      disabled={phoneLocked}
                      aria-label="Handynummer ändern"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                  {phoneLocked && phoneNextChangeDate && (
                    <p className="text-xs text-muted-foreground">
                      Handynummer kann erst wieder ab {format(phoneNextChangeDate, 'dd.MM.yyyy', { locale: de })} geändert werden (90 Tage Sperre).
                    </p>
                  )}
                </>
              ) : (
                <Button variant="outline" className="w-full" onClick={openPhoneDialog}>
                  <Smartphone className="h-4 w-4 mr-2" />
                  Handynummer hinzufügen
                </Button>
              )}
            </div>

            {showPasswordOption && (
              <Button variant="outline" className="w-full" onClick={() => setPasswordDialogOpen(true)}>
                Passwort ändern
              </Button>
            )}

            <div className="pt-4 border-t">
              <Button variant="destructive" className="w-full" onClick={() => setDeleteDialogOpen(true)}>
                Konto löschen
              </Button>
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} className="w-full bg-gradient-to-r from-primary to-secondary" disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Änderungen speichern
        </Button>
      </div>

      {/* Phone Add/Change Dialog */}
      <Dialog open={phoneDialogOpen} onOpenChange={setPhoneDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{userPhone ? 'Handynummer ändern' : 'Handynummer hinzufügen'}</DialogTitle>
            <DialogDescription>
              {phoneStep === 'enter'
                ? 'Wir senden dir einen 4-stelligen Code per SMS.'
                : `Code an ${phoneInput} gesendet.`}
            </DialogDescription>
          </DialogHeader>
          {phoneStep === 'enter' ? (
            <div className="space-y-3">
              <Input
                type="tel"
                inputMode="tel"
                placeholder="z. B. 0151 23456789"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                className="h-12"
                autoFocus
              />
            </div>
          ) : (
            <div className="space-y-3 flex flex-col items-center">
              <InputOTP maxLength={4} value={phoneOtp} onChange={setPhoneOtp}>
                <InputOTPGroup className="gap-2">
                  {[0, 1, 2, 3].map((i) => (
                    <InputOTPSlot
                      key={i}
                      index={i}
                      className="h-14 w-12 text-2xl font-semibold rounded-md border-2 border-white/40 bg-white/10 text-white first:rounded-l-md last:rounded-r-md"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
              <button
                type="button"
                onClick={() => { setPhoneStep('enter'); setPhoneOtp(''); }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Andere Nummer verwenden
              </button>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPhoneDialogOpen(false)}>Abbrechen</Button>
            {phoneStep === 'enter' ? (
              <Button onClick={handleSendPhoneOtp} disabled={phoneWorking || !phoneInput}>
                {phoneWorking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Code senden
              </Button>
            ) : (
              <Button onClick={handleVerifyPhoneOtp} disabled={phoneWorking || phoneOtp.length !== 6}>
                {phoneWorking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Bestätigen
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Change Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Passwort ändern</DialogTitle>
            <DialogDescription>Gib dein neues Passwort ein</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Neues Passwort</Label>
              <div className="relative">
                <Input type={showPasswords ? 'text' : 'password'} placeholder="Mindestens 6 Zeichen" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="pr-10" />
                <button type="button" onClick={() => setShowPasswords(!showPasswords)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Passwort bestätigen</Label>
              <Input type={showPasswords ? 'text' : 'password'} placeholder="Passwort wiederholen" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={handleChangePassword} disabled={changingPassword}>
              {changingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <AlertDialogTitle className="text-xl">Konto wirklich löschen?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="space-y-3 text-left">
              <p className="font-medium text-foreground">Achtung: Diese Aktion kann nicht rückgängig gemacht werden!</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Alle deine gesammelten Punkte gehen unwiderruflich verloren</li>
                <li>Deine persönlichen Daten werden gelöscht</li>
                <li>Dein Konto kann nicht wiederhergestellt werden</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleting || !canDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Wird gelöscht...' : !canDelete ? `Warten (${deleteTimer}s)` : 'Ja, Konto löschen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
