/**
 * Lightweight localStorage helper for the V2 "aktivierte Prämie" flow.
 *
 * V2-Treuepass speichert pro Händler die aktuell aktivierte Prämie, damit
 * sie auch nach dem Verlassen der Detailseite (z. B. in der Scan-Seite)
 * sichtbar bleibt und beim nächsten Check-in eingelöst werden kann.
 */

export interface ActivatedReward {
  visitNumber: number;
  label: string;
}

const PREFIX = 'eloyo:activated-reward:';

function key(merchantId: string): string {
  return `${PREFIX}${merchantId}`;
}

export function setActivatedReward(merchantId: string, reward: ActivatedReward | null): void {
  if (typeof window === 'undefined' || !merchantId) return;
  try {
    if (!reward) {
      localStorage.removeItem(key(merchantId));
    } else {
      localStorage.setItem(key(merchantId), JSON.stringify(reward));
    }
  } catch {
    /* ignore quota errors */
  }
}

export function getActivatedReward(merchantId: string): ActivatedReward | null {
  if (typeof window === 'undefined' || !merchantId) return null;
  try {
    const raw = localStorage.getItem(key(merchantId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.label === 'string' && typeof parsed.visitNumber === 'number') {
      return parsed as ActivatedReward;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearActivatedReward(merchantId: string): void {
  setActivatedReward(merchantId, null);
}
