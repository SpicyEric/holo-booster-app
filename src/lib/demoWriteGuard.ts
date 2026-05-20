/**
 * Globaler Schreib-Schutz für den Demo-Merchant Modus.
 *
 * Wenn der Demo-Modus aktiv ist, werden alle mutierenden Supabase-Aufrufe
 * (insert / update / delete / upsert) sowie ausgewählte mutierende RPCs
 * abgefangen und kein write erfolgt. Stattdessen wird ein Toast angezeigt.
 *
 * Lese-Aufrufe (select) bleiben unverändert.
 *
 * Hinweis: Wir patchen den `from()`-Builder. Bei Aufruf einer mutierenden
 * Methode geben wir ein Thenable zurück, das `{ data: null, error: null }`
 * auflöst — wie ein erfolgreicher No-Op. Damit bleiben aufrufende Komponenten
 * (die häufig `if (error) toast.error(...)` prüfen) glücklich.
 */
import { supabase } from "@/integrations/supabase/client";
import { isDemoMerchantActive } from "@/lib/demoMerchant";
import { toast } from "sonner";

const DEMO_TOAST_ID = "demo-merchant-write-blocked";
const MUTATING_METHODS = new Set(["insert", "update", "delete", "upsert"]);

/**
 * Demo-Modus blockiert nur Writes innerhalb der Merchant-Oberfläche.
 * Admin- und Vertriebler-Seiten (z.B. /admin/boxes) sollen weiterhin
 * voll funktionieren, auch wenn parallel ein Demo-Account betreten wurde.
 */
function isDemoGuardedRoute(): boolean {
  if (typeof window === "undefined") return false;
  const p = window.location.pathname || "";
  if (p.startsWith("/admin")) return false;
  if (p.startsWith("/vertriebler")) return false;
  return true;
}

function shouldBlock(): boolean {
  return isDemoMerchantActive() && isDemoGuardedRoute();
}

let lastToastAt = 0;
function notifyBlocked() {
  const now = Date.now();
  if (now - lastToastAt < 800) return;
  lastToastAt = now;
  toast.info("Demo-Modus: Änderungen werden nicht gespeichert.", {
    id: DEMO_TOAST_ID,
    duration: 2200,
  });
}

/**
 * Erzeugt einen Builder, der wie ein Supabase-Query-Builder aussieht,
 * aber nichts ausführt. Jede Methode gibt sich selbst zurück, und der
 * Builder ist thenable mit `{ data: null, error: null }`.
 */
function createNoopBuilder(): any {
  const handler: ProxyHandler<any> = {
    get(_t, prop) {
      if (prop === "then") {
        return (resolve: any) => {
          notifyBlocked();
          return Promise.resolve({ data: null, error: null, count: null, status: 200, statusText: "OK (demo)" }).then(resolve);
        };
      }
      if (prop === "catch" || prop === "finally") {
        return (cb: any) => Promise.resolve({ data: null, error: null }).then(cb);
      }
      // Jede andere Methode gibt den Proxy selbst zurück (chaining).
      return () => proxy;
    },
  };
  const target = function () {};
  const proxy: any = new Proxy(target, handler);
  return proxy;
}

let installed = false;
export function installDemoWriteGuard() {
  if (installed) return;
  installed = true;

  const originalFrom = supabase.from.bind(supabase);

  (supabase as any).from = (table: string) => {
    const builder = originalFrom(table as any);
    if (!shouldBlock()) return builder;

    return new Proxy(builder, {
      get(target, prop, receiver) {
        if (typeof prop === "string" && MUTATING_METHODS.has(prop)) {
          return () => createNoopBuilder();
        }
        const value = Reflect.get(target, prop, receiver);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
  };

  // RPCs sind teils Lesefunktionen (z.B. lookup_invitation, has_role, list_*).
  // Wir blockieren nur explizit als mutierend bekannte RPC-Namen.
  const MUTATING_RPCS = new Set([
    "redeem_message_offer_via_nfc",
    "award_points_via_nfc",
    "consume_invitation",
    "create_invitation",
    "process_referral_bonus",
    "claim_orphan_nfc_chips",
    "mark_invitation_shared",
    "verify_email_token",
  ]);

  const originalRpc = supabase.rpc.bind(supabase);
  (supabase as any).rpc = (fn: string, args?: any, options?: any) => {
    if (shouldBlock() && MUTATING_RPCS.has(fn)) {
      notifyBlocked();
      return Promise.resolve({ data: null, error: null }) as any;
    }
    return originalRpc(fn as any, args, options);
  };

  // Storage-Uploads blockieren
  const storageFrom = supabase.storage.from.bind(supabase.storage);
  (supabase.storage as any).from = (bucket: string) => {
    const ref = storageFrom(bucket);
    if (!shouldBlock()) return ref;
    return new Proxy(ref, {
      get(target, prop, receiver) {
        if (prop === "upload" || prop === "remove" || prop === "move" || prop === "copy") {
          return () => {
            notifyBlocked();
            return Promise.resolve({ data: null, error: null }) as any;
          };
        }
        const value = Reflect.get(target, prop, receiver);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
  };

  // Auth-Mutationen ebenfalls blockieren (z.B. updateUser im Konto-Bereich)
  const originalUpdateUser = supabase.auth.updateUser.bind(supabase.auth);
  (supabase.auth as any).updateUser = async (...args: any[]) => {
    if (shouldBlock()) {
      notifyBlocked();
      return { data: { user: null }, error: null } as any;
    }
    return originalUpdateUser(...(args as []));
  };

  // Edge-Function-Aufrufe ebenfalls blockieren — die meisten verändern Daten.
  const originalInvoke = supabase.functions.invoke.bind(supabase.functions);
  (supabase.functions as any).invoke = async (name: string, opts?: any) => {
    if (shouldBlock()) {
      notifyBlocked();
      return { data: null, error: null } as any;
    }
    return originalInvoke(name as any, opts);
  };
}
