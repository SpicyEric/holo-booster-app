/**
 * Demo-Merchant Modus
 *
 * Erlaubt Admins und Vertriebspartnern, sich die Merchant-Oberfläche
 * aus der Sicht eines festen Demo-Accounts ("Backstube König") anzuschauen,
 * ohne dort etwas verändern zu können.
 *
 * Der Modus wird per localStorage aktiviert. Der eingeloggte User bleibt
 * derselbe — die Merchant-Pages laden ihre Daten lediglich für den festen
 * Demo-Customer. Schreibvorgänge werden global vom Supabase-Interceptor
 * abgefangen (siehe `installDemoWriteGuard`).
 */

export const DEMO_MERCHANT_CUSTOMER_ID = "e828d21a-f7c5-4c8e-bc8d-6301e3e3ab45";
export const DEMO_MERCHANT_NAME = "Backstube König";

const STORAGE_KEY = "eloyo:demo-merchant-active";
const RETURN_KEY = "eloyo:demo-merchant-return-path";
const EVENT_NAME = "eloyo:demo-merchant-changed";

export function isDemoMerchantActive(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function enableDemoMerchant(returnPath: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
    localStorage.setItem(RETURN_KEY, returnPath);
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch {}
}

export function disableDemoMerchant(): string {
  let returnPath = "/admin";
  try {
    returnPath = localStorage.getItem(RETURN_KEY) || returnPath;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(RETURN_KEY);
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch {}
  return returnPath;
}

export function onDemoMerchantChange(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener(EVENT_NAME, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT_NAME, handler);
    window.removeEventListener("storage", handler);
  };
}
