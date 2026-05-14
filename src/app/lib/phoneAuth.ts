import { supabase } from '@/integrations/supabase/client';

/**
 * Normalize phone numbers to E.164. Defaults to Germany (+49) when no
 * country code is present.
 */
export function normalizePhone(input: string, defaultCountry: '49' = '49'): string {
  let digits = input.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) {
    return '+' + digits.slice(1).replace(/\D/g, '');
  }
  digits = digits.replace(/^0+/, '');
  return '+' + defaultCountry + digits;
}

export function isValidE164(phone: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(phone);
}

/** Send OTP via Twilio Verify (rate-limited Edge Function). */
export async function sendPhoneOtp(phone: string) {
  const normalized = normalizePhone(phone);
  if (!isValidE164(normalized)) {
    throw new Error('Bitte gib eine gültige Handynummer ein');
  }
  const { data, error } = await supabase.functions.invoke('request-phone-otp', {
    body: { phone: normalized },
  });
  if (error) throw new Error(error.message || 'OTP-Versand fehlgeschlagen');
  if (data && (data as any).error) throw new Error((data as any).error);
  return normalized;
}

/**
 * Verify the 6-digit code via Twilio Verify, then sign the user in.
 * The Edge Function returns a one-time `token_hash` (magiclink) that we
 * redeem client-side to create a real Supabase session.
 */
export async function verifyPhoneOtp(phone: string, token: string) {
  const normalized = normalizePhone(phone);
  const { data, error } = await supabase.functions.invoke('verify-phone-otp', {
    body: { phone: normalized, code: token, mode: 'login' },
  });
  if (error) throw new Error(error.message || 'Code-Prüfung fehlgeschlagen');
  if (data && (data as any).error) throw new Error((data as any).error);

  const email = (data as any)?.email as string | undefined;
  const emailOtp = (data as any)?.email_otp as string | undefined;
  const tokenHash = (data as any)?.token_hash as string | undefined;
  if (!email || (!emailOtp && !tokenHash)) throw new Error('Login-Token fehlt');

  // Primary: 6-digit email_otp (most reliable with admin.generateLink)
  let session;
  if (emailOtp) {
    const r = await supabase.auth.verifyOtp({ email, token: emailOtp, type: 'email' });
    if (r.error) {
      // Fallback to token_hash variant
      if (tokenHash) {
        const r2 = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'email' });
        if (r2.error) throw r2.error;
        session = r2.data;
      } else {
        throw r.error;
      }
    } else {
      session = r.data;
    }
  } else if (tokenHash) {
    const r = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'email' });
    if (r.error) throw r.error;
    session = r.data;
  }
  return session;
}

/** Add a phone number to the currently logged-in user (sends OTP via Verify). */
export async function addPhoneToAccount(phone: string) {
  const normalized = normalizePhone(phone);
  if (!isValidE164(normalized)) {
    throw new Error('Bitte gib eine gültige Handynummer ein');
  }
  const { data, error } = await supabase.functions.invoke('request-phone-otp', {
    body: { phone: normalized },
  });
  if (error) throw new Error(error.message || 'OTP-Versand fehlgeschlagen');
  if (data && (data as any).error) throw new Error((data as any).error);
  return normalized;
}

/** Verify the OTP for adding a phone number to the existing logged-in account. */
export async function verifyPhoneChange(phone: string, token: string) {
  const normalized = normalizePhone(phone);
  const { data, error } = await supabase.functions.invoke('verify-phone-otp', {
    body: { phone: normalized, code: token, mode: 'change' },
  });
  if (error) throw new Error(error.message || 'Code-Prüfung fehlgeschlagen');
  if (data && (data as any).error) throw new Error((data as any).error);
  // Refresh derived auth_method (best-effort)
  try { await supabase.rpc('refresh_auth_method'); } catch { /* noop */ }
  return data;
}
