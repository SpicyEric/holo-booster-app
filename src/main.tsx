import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { registerNativeDeepLinkBootstrap } from "./app/lib/nativeDeepLinkBootstrap";
import { installDemoWriteGuard } from "./lib/demoWriteGuard";

registerNativeDeepLinkBootstrap();
installDemoWriteGuard();

// Apply saved dark mode preference ONLY for app routes to avoid flash
// Website (non-app) routes must always stay in light mode
const root = document.documentElement;
const isAppRoute = window.location.pathname.startsWith('/app');
root.setAttribute('data-app-route', isAppRoute ? 'true' : 'false');

if (isAppRoute) {
  const savedDark = localStorage.getItem('eloyo-dark-mode') === 'true';
  root.classList.toggle('dark', savedDark);
  root.classList.toggle('light', !savedDark);
  root.style.colorScheme = savedDark ? 'dark' : 'light';
} else {
  // Force light mode for website
  root.classList.remove('dark');
  root.classList.add('light');
  root.style.colorScheme = 'only light';
}

// Anti-Flackern: Für Merchant-Routes (/kunde) die zuletzt bekannte Markenfarbe
// SYNCHRON anwenden, bevor React mountet. Verhindert Lila → Brand-Farbe Flash
// in Sidebar/Buttons direkt nach Login oder beim Routenwechsel.
if (window.location.pathname.startsWith('/kunde')) {
  try {
    const raw = localStorage.getItem('eloyo-merchant-brand-cache');
    if (raw) {
      const cached = JSON.parse(raw);
      if (cached?.version === 'v2' && typeof cached?.color === 'string') {
        const hex = cached.color.replace('#', '').trim();
        const full = hex.length === 3 ? hex.split('').map((c: string) => c + c).join('') : hex;
        if (/^[0-9a-fA-F]{6}$/.test(full)) {
          const r = parseInt(full.slice(0, 2), 16) / 255;
          const g = parseInt(full.slice(2, 4), 16) / 255;
          const b = parseInt(full.slice(4, 6), 16) / 255;
          const max = Math.max(r, g, b), min = Math.min(r, g, b);
          const l = (max + min) / 2;
          let s = 0, hue = 0;
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
          const H = Math.round(hue), S = Math.round(s * 100), L = Math.round(l * 100);
          const hsl = `${H} ${S}% ${L}%`;
          const lum = (0.299 * r + 0.587 * g + 0.114 * b);
          const fg = lum > 0.6 ? '0 0% 10%' : '0 0% 100%';
          const dark = `${H} 50% 20%`;
          const tint96 = `${H} 42% 96%`;
          const tint98 = `${H} 42% 98%`;
          const tint92 = `${H} 42% 92%`;
          const s2 = root.style;
          s2.setProperty('--primary', hsl);
          s2.setProperty('--primary-foreground', fg);
          s2.setProperty('--secondary', hsl);
          s2.setProperty('--secondary-foreground', fg);
          s2.setProperty('--accent', hsl);
          s2.setProperty('--ring', hsl);
          s2.setProperty('--gradient-primary', `linear-gradient(135deg, hsl(${hsl}), hsl(${dark}))`);
          s2.setProperty('--gradient-glow', `linear-gradient(135deg, hsl(${hsl} / 0.12), hsl(${tint92} / 0.5))`);
          s2.setProperty('--shadow-glow', `0 4px 20px hsl(${hsl} / 0.18)`);
          s2.setProperty('--merchant-bg', tint96);
          s2.setProperty('--merchant-bg-soft', tint98);
          s2.setProperty('--merchant-sidebar', dark);
          s2.setProperty('--merchant-shadow', hsl);
        }
      }
    }
  } catch {}
}

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
