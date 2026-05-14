/**
 * HEX → HSL Konvertierung im Tailwind/CSS-Variable-Format ("H S% L%").
 * Wird verwendet, um `--primary` und verwandte Tokens dynamisch
 * mit der individuellen Markenfarbe eines Händlers zu überschreiben.
 */

export function hexToHslString(hex: string): string {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) {
    h = h.split('').map((c) => c + c).join('');
  }
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return '262 83% 58%'; // Fallback Eloyo Lila

  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let s = 0;
  let hue = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: hue = ((g - b) / d + (g < b ? 6 : 0)); break;
      case g: hue = ((b - r) / d + 2); break;
      case b: hue = ((r - g) / d + 4); break;
    }
    hue *= 60;
  }

  return `${Math.round(hue)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function brandTintHsl(hex: string, lightness = 96): string {
  const [hue] = hexToHslString(hex).split(' ');
  return `${hue} 42% ${lightness}%`;
}

export function brandDarkHsl(hex: string): string {
  const [hue] = hexToHslString(hex).split(' ');
  return `${hue} 50% 20%`;
}

/** Liefert eine kontrastierende Vordergrundfarbe (weiß oder dunkel) im HSL-Format. */
export function contrastForegroundHsl(hex: string): string {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return '0 0% 100%';
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '0 0% 10%' : '0 0% 100%';
}
