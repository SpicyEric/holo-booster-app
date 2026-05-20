/**
 * In-Memory-Store für Prämien-Platzierungen im Demo-Merchant-Modus.
 *
 * Im Demo-Modus dürfen wir nichts in die DB schreiben. Damit Platzierungen,
 * die im Treuepass gesetzt wurden, aber trotzdem in der Handy-Vorschau und
 * nach Tab-Wechseln sichtbar bleiben, halten wir sie hier zentral.
 *
 * Wird automatisch geleert, sobald der Demo-Modus verlassen wird.
 */
import { onDemoMerchantChange, isDemoMerchantActive } from "@/lib/demoMerchant";

export interface DemoPlacement {
  id: string;
  reward_id: string;
  visit: number;
}

type Store = Record<string, DemoPlacement[]>;

let store: Store = {};
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => {
    try {
      l();
    } catch {
      /* noop */
    }
  });
}

export function getDemoPlacements(customerId: string | null): DemoPlacement[] {
  if (!customerId) return [];
  return store[customerId] ? [...store[customerId]] : [];
}

export function setDemoPlacements(
  customerId: string,
  updater: DemoPlacement[] | ((prev: DemoPlacement[]) => DemoPlacement[])
) {
  const prev = store[customerId] || [];
  const next = typeof updater === "function" ? (updater as any)(prev) : updater;
  store[customerId] = next;
  emit();
}

export function subscribeDemoPlacements(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function clearDemoPlacements() {
  store = {};
  emit();
}

// Beim Verlassen des Demo-Modus alles vergessen.
onDemoMerchantChange(() => {
  if (!isDemoMerchantActive()) clearDemoPlacements();
});
