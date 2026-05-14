/**
 * Globale, leichtgewichtige Veröffentlichung der aktiven Markenfarbe.
 *
 * Wird von V2-Treuepass-Seiten gesetzt, damit die BottomNav (Scan-Button)
 * sich an die Farbe des gerade angezeigten Händlers anpassen kann.
 */

const VAR_NAME = '--app-active-brand';
const SOFT_VAR = '--app-active-brand-soft';

let currentColor: string | null = null;
const listeners = new Set<(c: string | null) => void>();

export function setActiveBrandColor(hex: string | null): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (!hex) {
    root.style.removeProperty(VAR_NAME);
    root.style.removeProperty(SOFT_VAR);
  } else {
    root.style.setProperty(VAR_NAME, hex);
    root.style.setProperty(SOFT_VAR, `color-mix(in srgb, ${hex} 70%, white)`);
  }
  if (currentColor !== hex) {
    currentColor = hex;
    listeners.forEach((l) => l(hex));
  }
}

export function getActiveBrandColor(): string | null {
  return currentColor;
}

export function subscribeActiveBrandColor(listener: (c: string | null) => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
