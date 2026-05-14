/**
 * Globale, leichtgewichtige Veröffentlichung der aktiven Markenfarbe.
 *
 * Wird von V2-Treuepass-Seiten gesetzt, damit die BottomNav (Scan-Button)
 * sich an die Farbe des gerade angezeigten Händlers anpassen kann.
 *
 * Standard-Farbe (BottomNav-Default) ist das Eloyo-Lila → wenn `null`
 * gesetzt wird, fällt der Button auf den Default-Gradient zurück.
 */

const VAR_NAME = '--app-active-brand';
const SOFT_VAR = '--app-active-brand-soft';

export function setActiveBrandColor(hex: string | null): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (!hex) {
    root.style.removeProperty(VAR_NAME);
    root.style.removeProperty(SOFT_VAR);
    return;
  }
  root.style.setProperty(VAR_NAME, hex);
  // Erzeugt einen leicht abgeschwächten Begleitton via color-mix
  root.style.setProperty(SOFT_VAR, `color-mix(in srgb, ${hex} 70%, white)`);
}
