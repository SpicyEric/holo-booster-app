/**
 * 5-stelliger Verifikations-Code für Prämien-Einlösungen.
 * Großbuchstaben + Ziffern, ohne verwechselbare Zeichen:
 * - keine 0, keine 1
 * - kein I, L, O
 */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateVerificationCode(length = 5): string {
  let code = '';
  const cryptoObj = typeof crypto !== 'undefined' ? crypto : undefined;
  if (cryptoObj?.getRandomValues) {
    const buf = new Uint32Array(length);
    cryptoObj.getRandomValues(buf);
    for (let i = 0; i < length; i++) {
      code += ALPHABET[buf[i] % ALPHABET.length];
    }
  } else {
    for (let i = 0; i < length; i++) {
      code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    }
  }
  return code;
}
