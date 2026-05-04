/**
 * Demo-Merchant Modus
 *
 * Erlaubt Admins und Vertriebspartnern, sich die Merchant-Oberfläche
 * aus der Sicht eines Demo-Accounts anzuschauen, ohne dort etwas
 * verändern zu können.
 *
 * Standard-Demo-Account ist "Backstube König" (Sidebar-Eintrag).
 * Über `enableDemoMerchant({ customerId, name })` kann ein Admin auch
 * jeden beliebigen anderen Kunden als Demo-Account betreten – z.B. über
 * den "Dashboard ansehen"-Button in der Customer-Detail-Seite.
 *
 * Der eingeloggte User bleibt dabei immer derselbe – die Merchant-Pages
 * laden ihre Daten lediglich für den Demo-Customer. Schreibvorgänge
 * werden global vom Supabase-Interceptor abgefangen
 * (siehe `installDemoWriteGuard`).
 */

export const DEFAULT_DEMO_MERCHANT_CUSTOMER_ID = "e828d21a-f7c5-4c8e-bc8d-6301e3e3ab45";
export const DEFAULT_DEMO_MERCHANT_NAME = "Backstube König";

const STORAGE_KEY = "eloyo:demo-merchant-active";
const RETURN_KEY = "eloyo:demo-merchant-return-path";
const CUSTOMER_ID_KEY = "eloyo:demo-merchant-customer-id";
const CUSTOMER_NAME_KEY = "eloyo:demo-merchant-customer-name";
const EVENT_NAME = "eloyo:demo-merchant-changed";

export function isDemoMerchantActive(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/** Dynamische Demo-Customer-ID für die aktuelle Session (Fallback: Backstube König). */
export function getDemoMerchantCustomerId(): string {
  if (typeof window === "undefined") return DEFAULT_DEMO_MERCHANT_CUSTOMER_ID;
  try {
    return localStorage.getItem(CUSTOMER_ID_KEY) || DEFAULT_DEMO_MERCHANT_CUSTOMER_ID;
  } catch {
    return DEFAULT_DEMO_MERCHANT_CUSTOMER_ID;
  }
}

/** Anzeigename des aktuell betretenen Demo-Accounts (Fallback: Backstube König). */
export function getDemoMerchantName(): string {
  if (typeof window === "undefined") return DEFAULT_DEMO_MERCHANT_NAME;
  try {
    return localStorage.getItem(CUSTOMER_NAME_KEY) || DEFAULT_DEMO_MERCHANT_NAME;
  } catch {
    return DEFAULT_DEMO_MERCHANT_NAME;
  }
}

// Backwards-compat (wird für den fixen Sidebar-Eintrag noch verwendet)
export const DEMO_MERCHANT_CUSTOMER_ID = DEFAULT_DEMO_MERCHANT_CUSTOMER_ID;
export const DEMO_MERCHANT_NAME = DEFAULT_DEMO_MERCHANT_NAME;

interface EnableOptions {
  returnPath: string;
  customerId?: string;
  name?: string;
}

export function enableDemoMerchant(returnPathOrOptions: string | EnableOptions): void {
  const opts: EnableOptions =
    typeof returnPathOrOptions === "string"
      ? { returnPath: returnPathOrOptions }
      : returnPathOrOptions;
  try {
    localStorage.setItem(STORAGE_KEY, "1");
    localStorage.setItem(RETURN_KEY, opts.returnPath);
    if (opts.customerId) {
      localStorage.setItem(CUSTOMER_ID_KEY, opts.customerId);
    } else {
      localStorage.removeItem(CUSTOMER_ID_KEY);
    }
    if (opts.name) {
      localStorage.setItem(CUSTOMER_NAME_KEY, opts.name);
    } else {
      localStorage.removeItem(CUSTOMER_NAME_KEY);
    }
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch {}
}

export function disableDemoMerchant(): string {
  let returnPath = "/admin";
  try {
    returnPath = localStorage.getItem(RETURN_KEY) || returnPath;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(RETURN_KEY);
    localStorage.removeItem(CUSTOMER_ID_KEY);
    localStorage.removeItem(CUSTOMER_NAME_KEY);
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
