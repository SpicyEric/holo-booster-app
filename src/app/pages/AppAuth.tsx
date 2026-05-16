import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, Smartphone, ArrowLeft } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { toast } from 'sonner';
import { useAppViewportLock } from '@/app/hooks/useAppViewportLock';
import { sendPhoneOtp, verifyPhoneOtp, normalizePhone, isValidE164 } from '@/app/lib/phoneAuth';

const getPostAuthRoute = () => {
  const isNative = Capacitor.isNativePlatform();
  const permissionsCompleted = localStorage.getItem('eloyo_permissions_completed') === 'true';
  if (isNative && !permissionsCompleted) return '/app/permissions';
  return '/app';
};

type AuthMode = 'choose' | 'phone' | 'email-login' | 'email-forgot' | 'recovery';
type PhoneStep = 'enter' | 'verify';

export const AppAuth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  useAppViewportLock();

  const [mode, setMode] = useState<AuthMode>('choose');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Phone flow
  const [phoneStep, setPhoneStep] = useState<PhoneStep>('enter');
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Email login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Forgot password
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  // Recovery
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Detect recovery hash
  useEffect(() => {
    const hash = window.location.hash || location.hash || '';
    if (hash.includes('type=recovery')) {
      setMode('recovery');
    }
  }, [location.hash]);

  // Resend cooldown ticker
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // Auto-submit OTP once all 4 digits entered
  useEffect(() => {
    if (mode === 'phone' && phoneStep === 'verify' && otpCode.length === 4 && !loading) {
      handleVerifyOtp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otpCode, mode, phoneStep]);

  const ensureAppRoleAndProceed = async (userId: string) => {
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    const roles = (rolesData || []).map((r) => r.role as string);
    const hasAppRole = roles.includes('end_customer') || roles.includes('customer');

    if (roles.length === 0) {
      await supabase.from('user_roles').insert({ user_id: userId, role: 'end_customer' });
    } else if (!hasAppRole) {
      await supabase.auth.signOut();
      toast.error('Dieses Konto ist für das Business-Dashboard.');
      return false;
    }

    // Make sure a profile row exists, then increment login count
    await supabase.from('profiles').upsert({ user_id: userId }, { onConflict: 'user_id' });
    await supabase.rpc('increment_login_count');
    await supabase.rpc('refresh_auth_method');
    // Deliver welcome messages on first login (no-op if already sent)
    try { await supabase.rpc('send_welcome_messages_if_needed'); } catch (e) { console.warn('welcome msgs', e); }
    return true;
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    try {
      const normalized = normalizePhone(phone);
      if (!isValidE164(normalized)) {
        toast.error('Bitte gib eine gültige Handynummer ein');
        return;
      }
      await sendPhoneOtp(phone);
      setPhone(normalized);
      setPhoneStep('verify');
      setResendCooldown(60);
      toast.success('SMS-Code gesendet');
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.toLowerCase().includes('rate')) {
        toast.error('Bitte warte einen Moment, bevor du es erneut versuchst.');
      } else if (msg.toLowerCase().includes('phone') && msg.toLowerCase().includes('disabled')) {
        toast.error('SMS-Login ist noch nicht aktiviert. Bitte E-Mail nutzen.');
      } else {
        toast.error(msg || 'SMS konnte nicht gesendet werden');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) return;
    setLoading(true);
    try {
      const { user } = await verifyPhoneOtp(phone, otpCode);
      if (!user) throw new Error('Anmeldung fehlgeschlagen');
      const ok = await ensureAppRoleAndProceed(user.id);
      if (!ok) return;
      toast.success('Willkommen!');
      navigate(getPostAuthRoute());
    } catch (err: any) {
      toast.error(err?.message || 'Ungültiger Code');
      setOtpCode('');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });
      if (error) throw error;
      const ok = await ensureAppRoleAndProceed(data.user.id);
      if (!ok) return;
      toast.success('Willkommen zurück!');
      navigate(getPostAuthRoute());
    } catch (err: any) {
      if (err.message?.includes('Invalid')) {
        toast.error('Ungültige Anmeldedaten');
      } else {
        toast.error(err.message || 'Anmeldung fehlgeschlagen');
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
      toast.success('Falls ein Konto existiert, erhältst du eine E-Mail.');
    } catch (err: any) {
      toast.error(err.message || 'Fehler beim Senden');
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
      toast.success('Passwort wurde geändert!');
      setMode('choose');
      navigate(getPostAuthRoute());
    } catch (err: any) {
      toast.error(err.message || 'Fehler beim Setzen des Passworts');
    } finally {
      setLoading(false);
    }
  };

  // ===== Recovery =====
  if (mode === 'recovery') {
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

  // ===== Shell =====
  return (
    <div className="h-[100dvh] overflow-y-auto bg-gradient-to-b from-primary/5 to-background flex flex-col items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/eloyo-logo.png" alt="Eloyo" className="h-12 mx-auto mb-2" />
          <p className="text-muted-foreground">Deine Treuepunkte-App</p>
        </div>

        <div className="bg-card rounded-2xl p-6 shadow-lg border">
          <AnimatePresence mode="wait">
            {/* CHOOSE */}
            {mode === 'choose' && (
              <motion.div key="choose" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
                <h2 className="text-2xl font-bold text-center">Anmelden bei Eloyo</h2>
                <Button
                  onClick={() => setMode('phone')}
                  className="w-full h-14 text-base bg-gradient-to-r from-primary to-secondary"
                >
                  <Smartphone className="h-5 w-5 mr-2" />
                  Mit Handynummer anmelden
                </Button>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">oder</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <button
                  onClick={() => setMode('email-login')}
                  className="w-full text-center text-sm font-medium text-foreground hover:text-primary transition-colors py-2"
                >
                  <Mail className="h-4 w-4 inline mr-1.5" />
                  Mit E-Mail anmelden
                </button>
                <p className="text-center text-xs text-muted-foreground pt-2">
                  Neu hier? Tippe oben auf „Mit Handynummer anmelden" – dein Konto wird automatisch erstellt.
                </p>
              </motion.div>
            )}

            {/* PHONE */}
            {mode === 'phone' && (
              <motion.div key="phone" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-5">
                <button
                  onClick={() => { setMode('choose'); setPhoneStep('enter'); setOtpCode(''); }}
                  className="text-sm text-muted-foreground flex items-center gap-1 hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" /> Zurück
                </button>

                {phoneStep === 'enter' ? (
                  <>
                    <div>
                      <h2 className="text-2xl font-bold">Handynummer eingeben</h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        Wir senden dir einen 6-stelligen Code per SMS.
                      </p>
                    </div>
                    <form onSubmit={handleSendOtp} className="space-y-4">
                      <Input
                        type="tel"
                        inputMode="tel"
                        placeholder="z. B. 0151 23456789"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="h-12 text-lg"
                        autoFocus
                        required
                      />
                      <Button
                        type="submit"
                        className="w-full h-12 bg-gradient-to-r from-primary to-secondary"
                        disabled={loading}
                      >
                        {loading ? 'Wird gesendet…' : 'Code senden'}
                      </Button>
                    </form>
                  </>
                ) : (
                  <>
                    <div>
                      <h2 className="text-2xl font-bold">Code eingeben</h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        Wir haben dir einen Code an <strong>{phone}</strong> gesendet.
                      </p>
                    </div>
                    <div className="flex justify-center">
                      <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                        <InputOTPGroup>
                          {[0, 1, 2, 3, 4, 5].map((i) => (
                            <InputOTPSlot key={i} index={i} className="h-12 w-10 text-lg" />
                          ))}
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    <Button
                      onClick={handleVerifyOtp}
                      className="w-full h-12 bg-gradient-to-r from-primary to-secondary"
                      disabled={loading || otpCode.length !== 6}
                    >
                      {loading ? 'Wird geprüft…' : 'Bestätigen'}
                    </Button>
                    <button
                      type="button"
                      onClick={() => handleSendOtp()}
                      disabled={resendCooldown > 0 || loading}
                      className="w-full text-center text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
                    >
                      {resendCooldown > 0 ? `Code erneut senden (${resendCooldown}s)` : 'Code erneut senden'}
                    </button>
                    <button
                      onClick={() => { setPhoneStep('enter'); setOtpCode(''); }}
                      className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
                    >
                      Andere Nummer verwenden
                    </button>
                  </>
                )}
              </motion.div>
            )}

            {/* EMAIL LOGIN */}
            {mode === 'email-login' && (
              <motion.div key="email-login" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4">
                <button
                  onClick={() => setMode('choose')}
                  className="text-sm text-muted-foreground flex items-center gap-1 hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" /> Zurück
                </button>
                <h2 className="text-2xl font-bold">Mit E-Mail anmelden</h2>
                <form onSubmit={handleEmailLogin} className="space-y-4">
                  <Input type="email" placeholder="E-Mail-Adresse" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="h-12" required />
                  <div className="relative">
                    <Input type={showPassword ? 'text' : 'password'} placeholder="Passwort" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="h-12 pr-12" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  <button type="button" onClick={() => { setMode('email-forgot'); setForgotEmail(loginEmail); }} className="text-sm text-primary hover:underline w-full text-right">
                    Passwort vergessen?
                  </button>
                  <Button type="submit" className="w-full h-12 bg-gradient-to-r from-primary to-secondary" disabled={loading}>
                    {loading ? 'Anmelden…' : 'Anmelden'}
                  </Button>
                </form>
              </motion.div>
            )}

            {/* FORGOT */}
            {mode === 'email-forgot' && (
              <motion.div key="forgot" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4">
                <button
                  onClick={() => { setMode('email-login'); setForgotSent(false); }}
                  className="text-sm text-muted-foreground flex items-center gap-1 hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" /> Zurück
                </button>
                {forgotSent ? (
                  <div className="text-center space-y-4">
                    <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                      <Mail className="h-8 w-8 text-primary" />
                    </div>
                    <h2 className="text-xl font-bold">E-Mail gesendet!</h2>
                    <p className="text-muted-foreground text-sm">
                      Falls ein Konto mit <strong>{forgotEmail}</strong> existiert, erhältst du eine E-Mail mit einem Link.
                    </p>
                  </div>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold">Passwort vergessen?</h2>
                    <p className="text-muted-foreground text-sm">
                      Gib deine E-Mail-Adresse ein und wir senden dir einen Link zum Zurücksetzen.
                    </p>
                    <form onSubmit={handleForgotPassword} className="space-y-4">
                      <Input type="email" placeholder="E-Mail-Adresse" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} className="h-12" required autoFocus />
                      <Button type="submit" className="w-full h-12 bg-gradient-to-r from-primary to-secondary" disabled={loading}>
                        {loading ? 'Wird gesendet…' : 'Link senden'}
                      </Button>
                    </form>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default AppAuth;
