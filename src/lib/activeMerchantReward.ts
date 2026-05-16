import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

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

export interface ActivatedRewardEntry extends ActivatedReward {
  merchantId: string;
}

const PREFIX = 'eloyo:activated-reward:';

const isNative = () => Capacitor.isNativePlatform();

function key(merchantId: string): string {
  return `${PREFIX}${merchantId}`;
}

function parseReward(raw: string | null): ActivatedReward | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.label === 'string' && typeof parsed.visitNumber === 'number') {
      return parsed as ActivatedReward;
    }
    return null;
  } catch {
    return null;
  }
}

export function setActivatedReward(merchantId: string, reward: ActivatedReward | null): void {
  if (typeof window === 'undefined' || !merchantId) return;
  try {
    if (!reward) {
      localStorage.removeItem(key(merchantId));
      if (isNative()) void Preferences.remove({ key: key(merchantId) });
    } else {
      const value = JSON.stringify(reward);
      localStorage.setItem(key(merchantId), value);
      if (isNative()) void Preferences.set({ key: key(merchantId), value });
    }
  } catch {
    /* ignore quota errors */
  }
}

export async function setActivatedRewardAsync(merchantId: string, reward: ActivatedReward | null): Promise<void> {
  if (typeof window === 'undefined' || !merchantId) return;
  setActivatedReward(merchantId, reward);
  if (!isNative()) return;
  if (!reward) {
    await Preferences.remove({ key: key(merchantId) });
  } else {
    await Preferences.set({ key: key(merchantId), value: JSON.stringify(reward) });
  }
}

export function getActivatedReward(merchantId: string): ActivatedReward | null {
  if (typeof window === 'undefined' || !merchantId) return null;
  try {
    return parseReward(localStorage.getItem(key(merchantId)));
  } catch {
    return null;
  }
}

export async function getActivatedRewardAsync(merchantId: string): Promise<ActivatedReward | null> {
  const local = getActivatedReward(merchantId);
  if (local || !merchantId || !isNative()) return local;
  try {
    const { value } = await Preferences.get({ key: key(merchantId) });
    return parseReward(value);
  } catch {
    return null;
  }
}

export async function getAllActivatedRewardsAsync(): Promise<ActivatedRewardEntry[]> {
  const entries = new Map<string, ActivatedReward>();
  if (typeof window !== 'undefined') {
    try {
      for (let i = 0; i < localStorage.length; i += 1) {
        const storageKey = localStorage.key(i);
        if (!storageKey?.startsWith(PREFIX)) continue;
        const reward = parseReward(localStorage.getItem(storageKey));
        const merchantId = storageKey.slice(PREFIX.length);
        if (merchantId && reward) entries.set(merchantId, reward);
      }
    } catch {
      /* ignore */
    }
  }
  if (isNative()) {
    try {
      const { keys } = await Preferences.keys();
      await Promise.all(keys.filter((storageKey) => storageKey.startsWith(PREFIX)).map(async (storageKey) => {
        const { value } = await Preferences.get({ key: storageKey });
        const reward = parseReward(value);
        const merchantId = storageKey.slice(PREFIX.length);
        if (merchantId && reward) entries.set(merchantId, reward);
      }));
    } catch {
      /* ignore */
    }
  }
  return Array.from(entries, ([merchantId, reward]) => ({ merchantId, ...reward }));
}

export function clearActivatedReward(merchantId: string): void {
  setActivatedReward(merchantId, null);
}
