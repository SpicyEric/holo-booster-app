/**
 * Erzeugt einen stabilen, lokalen Device-Fingerprint für Anti-Missbrauch.
 * Bewusst simpel: keine externen Bibliotheken, kein Tracking — nur lokal generierte UUID,
 * angereichert mit Plattform/Sprache. Persistiert in localStorage, damit derselbe Browser
 * bei wiederholten Sessions denselben Fingerprint behält.
 */
const STORAGE_KEY = 'eloyo_device_fp';

export function getDeviceFingerprint(): string {
  try {
    let fp = localStorage.getItem(STORAGE_KEY);
    if (fp) return fp;

    const random = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`)
      .replace(/-/g, '')
      .slice(0, 16);
    const platform = (navigator.platform || 'unknown').toLowerCase().replace(/\s+/g, '');
    const lang = (navigator.language || 'xx').slice(0, 5);
    fp = `${platform}-${lang}-${random}`;
    localStorage.setItem(STORAGE_KEY, fp);
    return fp;
  } catch {
    return `fallback-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
