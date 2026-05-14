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

  const tokenHash = (data as any)?.token_hash as string | undefined;
  if (!tokenHash) throw new Error('Login-Token fehlt');

  const { data: session, error: sErr } = await supabase.auth.verifyOtp({
    type: 'magiclink',
    token_hash: tokenHash,
  });
  if (sErr) throw sErr;
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
