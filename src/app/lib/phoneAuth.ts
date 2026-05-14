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
  // Strip leading zeros (German trunk prefix)
  digits = digits.replace(/^0+/, '');
  return '+' + defaultCountry + digits;
}

export function isValidE164(phone: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(phone);
}

/** Send OTP for phone-based login or signup. */
export async function sendPhoneOtp(phone: string) {
  const normalized = normalizePhone(phone);
  if (!isValidE164(normalized)) {
    throw new Error('Bitte gib eine gültige Handynummer ein');
  }
  const { error } = await supabase.auth.signInWithOtp({
    phone: normalized,
    options: { channel: 'sms' },
  });
  if (error) throw error;
  return normalized;
}

/** Verify the 6-digit code returned by the user. */
export async function verifyPhoneOtp(phone: string, token: string) {
  const normalized = normalizePhone(phone);
  const { data, error } = await supabase.auth.verifyOtp({
    phone: normalized,
    token,
    type: 'sms',
  });
  if (error) throw error;
  return data;
}

/** Add a phone number to the currently logged-in user (sends OTP). */
export async function addPhoneToAccount(phone: string) {
  const normalized = normalizePhone(phone);
  if (!isValidE164(normalized)) {
    throw new Error('Bitte gib eine gültige Handynummer ein');
  }
  const { error } = await supabase.auth.updateUser({ phone: normalized });
  if (error) throw error;
  return normalized;
}

/** Verify the OTP for adding a phone number to an existing account. */
export async function verifyPhoneChange(phone: string, token: string) {
  const normalized = normalizePhone(phone);
  const { data, error } = await supabase.auth.verifyOtp({
    phone: normalized,
    token,
    type: 'phone_change',
  });
  if (error) throw error;
  // Refresh derived auth_method
  await supabase.rpc('refresh_auth_method');
  return data;
}
