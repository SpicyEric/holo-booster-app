import { useState, useEffect } from 'react';
import { MainLayout } from '@/app/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { Loader2, Eye, EyeOff, AlertTriangle, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

export default function AppSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteTimer, setDeleteTimer] = useState(5);
  const [canDelete, setCanDelete] = useState(false);

  // Password change state
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  // Email change state
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);

  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('birth_date, gender')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profileData) {
          setBirthDate(profileData.birth_date || '');
          setGender(profileData.gender || '');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Delete timer countdown
  useEffect(() => {
    if (deleteDialogOpen && deleteTimer > 0) {
      const timer = setTimeout(() => {
        setDeleteTimer(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (deleteTimer === 0) {
      setCanDelete(true);
    }
  }, [deleteDialogOpen, deleteTimer]);

  // Reset timer when dialog closes
  useEffect(() => {
    if (!deleteDialogOpen) {
      setDeleteTimer(5);
      setCanDelete(false);
    }
  }, [deleteDialogOpen]);

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          birth_date: birthDate || null,
          gender: gender || null,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Änderungen gespeichert');
    } catch (error: any) {
      console.error('Error saving:', error);
      toast.error(`Fehler: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error('Neues Passwort muss mindestens 6 Zeichen haben');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error('Passwörter stimmen nicht überein');
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success('Passwort erfolgreich geändert');
      setPasswordDialogOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error(error.message || 'Fehler beim Ändern des Passworts');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    setDeleting(true);
    try {
      // Actually delete the account via edge function
      const { data, error } = await supabase.functions.invoke('deleteUserAccount', {
        body: { userId: user.id }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Sign out locally after successful deletion
      await supabase.auth.signOut();

      toast.success('Konto gelöscht', {
        description: 'Dein Konto wurde erfolgreich und unwiderruflich gelöscht.',
      });

      navigate('/app/auth');
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast.error(`Fehler beim Löschen: ${error.message}`);
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const formatBirthDate = (dateStr: string) => {
    if (!dateStr) return 'Nicht angegeben';
    try {
      return format(new Date(dateStr), 'dd. MMMM yyyy', { locale: de });
    } catch {
      return dateStr;
    }
  };

  const getGenderLabel = (g: string) => {
    switch (g) {
      case 'male': return 'Männlich';
      case 'female': return 'Weiblich';
      case 'unspecified': return 'Nicht angegeben';
      default: return 'Nicht angegeben';
    }
  };

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
        <Card>
          <CardHeader>
            <CardTitle>Persönliche Daten</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="birthDate">Geburtsdatum</Label>
              <Input
                id="birthDate"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">Geschlecht</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger>
                  <SelectValue placeholder="Geschlecht auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Männlich</SelectItem>
                  <SelectItem value="female">Weiblich</SelectItem>
                  <SelectItem value="unspecified">Möchte ich nicht angeben</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>E-Mail</Label>
              {editingEmail ? (
                <div className="space-y-2">
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Neue E-Mail-Adresse"
                  />
                  <p className="text-xs text-muted-foreground">
                    Du erhältst eine Bestätigungsmail an die neue Adresse.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={savingEmail || !newEmail || newEmail === user?.email}
                      onClick={async () => {
                        setSavingEmail(true);
                        try {
                          const { error } = await supabase.auth.updateUser({ email: newEmail });
                          if (error) throw error;
                          toast.success('Bestätigungsmail gesendet', {
                            description: 'Bitte bestätige deine neue E-Mail-Adresse über den Link in der E-Mail.',
                          });
                          setEditingEmail(false);
                          setNewEmail('');
                        } catch (error: any) {
                          toast.error(error.message || 'Fehler beim Ändern der E-Mail');
                        } finally {
                          setSavingEmail(false);
                        }
                      }}
                    >
                      {savingEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Speichern
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setEditingEmail(false); setNewEmail(''); }}>
                      Abbrechen
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="p-3 rounded-md bg-muted text-muted-foreground flex-1">
                    {user?.email || ''}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => { setEditingEmail(true); setNewEmail(user?.email || ''); }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => setPasswordDialogOpen(true)}
            >
              Passwort ändern
            </Button>

            <div className="pt-4 border-t">
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setDeleteDialogOpen(true)}
              >
                Konto löschen
              </Button>
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={handleSave}
          className="w-full bg-gradient-to-r from-primary to-secondary"
          disabled={saving}
        >
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Änderungen speichern
        </Button>
      </div>

      {/* Password Change Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Passwort ändern</DialogTitle>
            <DialogDescription>
              Gib dein neues Passwort ein
            </DialogDescription>
          </DialogHeader>

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
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleChangePassword} disabled={changingPassword}>
              {changingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog with Timer */}
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
              <p className="font-medium text-foreground">
                Achtung: Diese Aktion kann nicht rückgängig gemacht werden!
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Alle deine gesammelten Punkte gehen unwiderruflich verloren</li>
                <li>Deine persönlichen Daten werden gelöscht</li>
                <li>Dein Konto kann nicht wiederhergestellt werden</li>
              </ul>
              <p className="text-sm text-muted-foreground">
                Anonymisierte Nutzungsdaten bleiben für statistische Zwecke erhalten.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleting || !canDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                'Wird gelöscht...'
              ) : !canDelete ? (
                `Warten (${deleteTimer}s)`
              ) : (
                'Ja, Konto löschen'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
