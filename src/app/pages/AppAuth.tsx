import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, ArrowRight, ArrowLeft, Check, Mail, RefreshCw } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useAppViewportLock } from '@/app/hooks/useAppViewportLock';

const getPostAuthRoute = () => {
  const isNative = Capacitor.isNativePlatform();
  const permissionsCompleted = localStorage.getItem('eloyo_permissions_completed') === 'true';
  if (isNative && !permissionsCompleted) return '/app/permissions';
  return '/app';
};

type RegistrationStep = 'password' | 'confirmPassword' | 'birthDate' | 'gender' | 'email';

export const AppAuth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  useAppViewportLock();
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Forgot password state
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  // Recovery mode (set new password after reset link)
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Registration state
  const [step, setStep] = useState<RegistrationStep>('password');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [birthDay, setBirthDay] = useState(15);
  const [birthMonth, setBirthMonth] = useState(6);
  const [birthYear, setBirthYear] = useState(2000);
  const [gender, setGender] = useState<'male' | 'female' | 'unspecified' | null>(null);
  const [email, setEmail] = useState('');

  // Detect recovery hash
  useEffect(() => {
    const hash = window.location.hash || location.hash || '';
    if (hash.includes('type=recovery')) {
      setIsRecoveryMode(true);
      setMode('login');
    }
  }, [location.hash]);

  const getAge = () => {
    const today = new Date();
    const birthDate = new Date(birthYear, birthMonth - 1, birthDay);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const isAgeValid = getAge() >= 14;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });
      if (error) throw error;

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id)
        .maybeSingle();

      const role = roleData?.role;
      if (!role) {
        await supabase.from('user_roles').insert({ user_id: data.user.id, role: 'end_customer' });
      } else if (role !== 'end_customer' && role !== 'customer') {
        await supabase.auth.signOut();
        toast.error('Dieses Konto ist für das Business-Dashboard.');
        setLoading(false);
        return;
      }

      toast.success('Willkommen zurück!');
      navigate(getPostAuthRoute());
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.message?.includes('Invalid')) {
        toast.error('Ungültige Anmeldedaten');
      } else {
        toast.error(error.message || 'Anmeldung fehlgeschlagen');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.includes('@')) {
      toast.error('Bitte gib eine gültige E-Mail-Adresse ein');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/app/auth`,
      });
      if (error) throw error;
      setForgotSent(true);
      toast.success('Falls ein Konto mit dieser E-Mail existiert, erhältst du eine E-Mail.');
    } catch (error: any) {
      toast.error(error.message || 'Fehler beim Senden');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('Passwort muss mindestens 6 Zeichen haben');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error('Passwörter stimmen nicht überein');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Passwort wurde erfolgreich geändert!');
      setIsRecoveryMode(false);
      navigate(getPostAuthRoute());
    } catch (error: any) {
      toast.error(error.message || 'Fehler beim Setzen des Passworts');
    } finally {
      setLoading(false);
    }
  };

  const handleNextStep = () => {
    if (step === 'password') {
      if (password.length < 6) {
        toast.error('Passwort muss mindestens 6 Zeichen haben');
        return;
      }
      setStep('confirmPassword');
    } else if (step === 'confirmPassword') {
      if (password !== confirmPassword) {
        toast.error('Passwörter stimmen nicht überein');
        return;
      }
      setStep('birthDate');
    } else if (step === 'birthDate') {
      if (!isAgeValid) return;
      setStep('gender');
    } else if (step === 'gender') {
      if (!gender) {
        toast.error('Bitte wähle eine Option');
        return;
      }
      setStep('email');
    } else if (step === 'email') {
      handleSignup();
    }
  };

  const handlePrevStep = () => {
    if (step === 'confirmPassword') setStep('password');
    else if (step === 'birthDate') setStep('confirmPassword');
    else if (step === 'gender') setStep('birthDate');
    else if (step === 'email') setStep('gender');
  };

  const handleSignup = async () => {
    if (!email.trim() || !email.includes('@')) {
      toast.error('Bitte gib eine gültige E-Mail-Adresse ein');
      return;
    }

    setLoading(true);
    try {
      const birthDate = `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`;

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/app`,
          data: {
            birth_date: birthDate,
            gender: gender,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        // Create/update profile (email_verified defaults to false)
        await supabase.from('profiles').upsert({
          user_id: data.user.id,
          birth_date: birthDate,
          gender: gender,
        }, { onConflict: 'user_id' });

        // Send verification email in background
        supabase.functions.invoke('send-app-verification-email', {
          body: {
            user_id: data.user.id,
            email: email.trim(),
            origin: window.location.origin,
          },
        }).catch(err => console.error('Failed to send verification email:', err));

        toast.success('Willkommen bei Eloyo! 🎉');
        navigate(getPostAuthRoute());
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      toast.error(error.message || 'Registrierung fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const months = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);

  const renderStep = () => {
    switch (step) {
      case 'password':
        return (
          <motion.div key="password" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Willkommen!</h2>
              <p className="text-muted-foreground">Erstelle jetzt dein Passwort</p>
            </div>
            <div className="relative">
              <Input type={showPassword ? 'text' : 'password'} placeholder="Mindestens 6 Zeichen" value={password} onChange={(e) => setPassword(e.target.value)} className="h-14 text-lg pr-12" autoFocus />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </motion.div>
        );

      case 'confirmPassword':
        return (
          <motion.div key="confirmPassword" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Passwort bestätigen</h2>
              <p className="text-muted-foreground">Wiederhole dein Passwort</p>
            </div>
            <div className="relative">
              <Input type={showPassword ? 'text' : 'password'} placeholder="Passwort wiederholen" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="h-14 text-lg pr-12" autoFocus />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </motion.div>
        );

      case 'birthDate':
        return (
          <motion.div key="birthDate" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Wann hast du Geburtstag?</h2>
              <p className="text-muted-foreground">Du musst mindestens 14 Jahre alt sein</p>
            </div>
            {!isAgeValid && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-center">
                <p className="text-destructive text-sm">Leider kannst du Eloyo erst ab 14 Jahren nutzen.</p>
              </div>
            )}
            <div className="flex gap-2 justify-center">
              <div className="flex-1 max-w-[80px]">
                <label className="text-xs text-muted-foreground block text-center mb-1">Tag</label>
                <div className="h-40 overflow-y-auto rounded-lg border bg-background snap-y snap-mandatory">
                  {days.map((day) => (
                    <button key={day} onClick={() => setBirthDay(day)} className={`w-full py-2 snap-center transition-colors ${birthDay === day ? 'bg-primary text-primary-foreground font-bold' : 'hover:bg-muted'}`}>{day}</button>
                  ))}
                </div>
              </div>
              <div className="flex-1 max-w-[120px]">
                <label className="text-xs text-muted-foreground block text-center mb-1">Monat</label>
                <div className="h-40 overflow-y-auto rounded-lg border bg-background snap-y snap-mandatory">
                  {months.map((month, idx) => (
                    <button key={month} onClick={() => setBirthMonth(idx + 1)} className={`w-full py-2 snap-center transition-colors text-sm ${birthMonth === idx + 1 ? 'bg-primary text-primary-foreground font-bold' : 'hover:bg-muted'}`}>{month}</button>
                  ))}
                </div>
              </div>
              <div className="flex-1 max-w-[90px]">
                <label className="text-xs text-muted-foreground block text-center mb-1">Jahr</label>
                <div className="h-40 overflow-y-auto rounded-lg border bg-background snap-y snap-mandatory">
                  {years.map((year) => (
                    <button key={year} onClick={() => setBirthYear(year)} className={`w-full py-2 snap-center transition-colors ${birthYear === year ? 'bg-primary text-primary-foreground font-bold' : 'hover:bg-muted'}`}>{year}</button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        );

      case 'gender':
        return (
          <motion.div key="gender" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Wie möchtest du angesprochen werden?</h2>
              <p className="text-muted-foreground">Wähle dein Geschlecht</p>
            </div>
            <div className="space-y-3">
              {([
                { value: 'male', label: 'Männlich' },
                { value: 'female', label: 'Weiblich' },
                { value: 'unspecified', label: 'Möchte ich nicht angeben' },
              ] as const).map((option) => (
                <button key={option.value} onClick={() => setGender(option.value)} className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between ${gender === option.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                  <span className="font-medium">{option.label}</span>
                  {gender === option.value && (
                    <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        );

      case 'email':
        return (
          <motion.div key="email" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Fast geschafft!</h2>
              <p className="text-muted-foreground">Gib deine E-Mail-Adresse ein</p>
            </div>
            <Input type="email" placeholder="deine@email.de" value={email} onChange={(e) => setEmail(e.target.value)} className="h-14 text-lg" autoFocus />
          </motion.div>
        );
    }
  };

  // Recovery mode - set new password
  if (isRecoveryMode) {
    return (
      <div className="h-[100dvh] overflow-y-auto bg-gradient-to-b from-primary/5 to-background flex flex-col items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="text-center mb-8">
            <img src="/eloyo-logo.png" alt="Eloyo" className="h-12 mx-auto mb-2" />
            <p className="text-muted-foreground">Neues Passwort festlegen</p>
          </div>
          <div className="bg-card rounded-2xl p-6 shadow-lg border">
            <h2 className="text-2xl font-bold text-center mb-6">Passwort zurücksetzen</h2>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="relative">
                <Input type={showPassword ? 'text' : 'password'} placeholder="Neues Passwort" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="h-12 pr-12" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <Input type={showPassword ? 'text' : 'password'} placeholder="Passwort bestätigen" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} className="h-12" required />
              <Button type="submit" className="w-full h-12 bg-gradient-to-r from-primary to-secondary" disabled={loading}>
                {loading ? 'Wird gespeichert...' : 'Passwort speichern'}
              </Button>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  // Login mode
  if (mode === 'login') {
    return (
      <div className="h-[100dvh] overflow-y-auto bg-gradient-to-b from-primary/5 to-background flex flex-col items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="text-center mb-8">
            <img src="/eloyo-logo.png" alt="Eloyo" className="h-12 mx-auto mb-2" />
            <p className="text-muted-foreground">Deine Treuepunkte-App</p>
          </div>

          <div className="bg-card rounded-2xl p-6 shadow-lg border">
            {forgotMode ? (
              // Forgot password mode
              forgotSent ? (
                <div className="text-center space-y-4">
                  <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                    <Mail className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold">E-Mail gesendet!</h2>
                  <p className="text-muted-foreground text-sm">
                    Falls ein Konto mit <strong>{forgotEmail}</strong> existiert, erhältst du eine E-Mail mit einem Link zum Zurücksetzen deines Passworts.
                  </p>
                  <Button variant="outline" className="w-full" onClick={() => { setForgotMode(false); setForgotSent(false); }}>
                    Zurück zum Login
                  </Button>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-center mb-2">Passwort vergessen?</h2>
                  <p className="text-muted-foreground text-center text-sm mb-6">
                    Gib deine E-Mail-Adresse ein und wir senden dir einen Link zum Zurücksetzen.
                  </p>
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <Input type="email" placeholder="E-Mail-Adresse" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} className="h-12" required autoFocus />
                    <Button type="submit" className="w-full h-12 bg-gradient-to-r from-primary to-secondary" disabled={loading}>
                      {loading ? 'Wird gesendet...' : 'Link senden'}
                    </Button>
                  </form>
                  <button onClick={() => setForgotMode(false)} className="w-full text-center text-sm text-muted-foreground mt-4 hover:text-foreground">
                    Zurück zum Login
                  </button>
                </>
              )
            ) : (
              // Normal login
              <>
                <h2 className="text-2xl font-bold text-center mb-6">Anmelden</h2>
                <form onSubmit={handleLogin} className="space-y-4">
                  <Input type="email" placeholder="E-Mail-Adresse" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="h-12" required />
                  <div className="relative">
                    <Input type={showPassword ? 'text' : 'password'} placeholder="Passwort" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="h-12 pr-12" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  <button type="button" onClick={() => { setForgotMode(true); setForgotEmail(loginEmail); }} className="text-sm text-primary hover:underline w-full text-right">
                    Passwort vergessen?
                  </button>
                  <Button type="submit" className="w-full h-12 bg-gradient-to-r from-primary to-secondary" disabled={loading}>
                    {loading ? 'Anmelden...' : 'Anmelden'}
                  </Button>
                </form>
              </>
            )}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Noch kein Konto?{' '}
            <button onClick={() => setMode('register')} className="text-primary font-medium hover:underline">
              Jetzt registrieren
            </button>
          </p>
        </motion.div>
      </div>
    );
  }

  // Registration mode
  return (
    <div className="h-[100dvh] overflow-y-auto bg-gradient-to-b from-primary/5 to-background flex flex-col items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/eloyo-logo.png" alt="Eloyo" className="h-12 mx-auto mb-2" />
          <p className="text-muted-foreground">Deine Treuepunkte-App</p>
        </div>

        <div className="bg-card rounded-2xl p-6 shadow-lg border min-h-[350px] flex flex-col">
          <AnimatePresence mode="wait">
            {renderStep()}
          </AnimatePresence>

          <div className="mt-auto pt-6 flex gap-3">
            {step !== 'password' && (
              <Button variant="outline" onClick={handlePrevStep} className="flex-1 h-12">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Zurück
              </Button>
            )}
            <Button
              onClick={handleNextStep}
              className="flex-1 h-12 bg-gradient-to-r from-primary to-secondary"
              disabled={loading || (step === 'birthDate' && !isAgeValid) || (step === 'gender' && !gender)}
            >
              {loading ? 'Laden...' : step === 'email' ? 'Registrieren' : (
                <>Weiter<ArrowRight className="h-4 w-4 ml-2" /></>
              )}
            </Button>
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Du hast schon ein Konto?{' '}
          <button onClick={() => setMode('login')} className="text-primary font-medium hover:underline">
            Zum Login
          </button>
        </p>
      </motion.div>
    </div>
  );
};

export default AppAuth;
