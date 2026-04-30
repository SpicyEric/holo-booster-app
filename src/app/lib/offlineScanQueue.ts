/**
 * Offline Scan Queue
 *
 * Stores NFC scans that happen while offline and replays them against
 * Supabase as soon as connectivity is restored. Server-side validation
 * remains the source of truth — the queue never bypasses it.
 */
import { persistentStorage } from '@/app/lib/preferencesStorage';
import { supabase } from '@/integrations/supabase/client';

const QUEUE_KEY = 'eloyo_offline_scan_queue_v2';

export type ScanStatus = 'pending' | 'syncing' | 'done' | 'failed';

export interface QueuedScan {
  id: string;
  nfcId: string;          // Hardware UID of the NFC card
  merchantId: string;     // Optional — '' if unknown (resolved server-side)
  userId: string;
  timestamp: string;      // ISO timestamp
  status: ScanStatus;
  error?: string;
  syncedAt?: string;
  pointsAwarded?: number;
  merchantName?: string;
}

type QueueListener = (queue: QueuedScan[]) => void;

const listeners = new Set<QueueListener>();
let processing = false;

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

async function readQueue(): Promise<QueuedScan[]> {
  try {
    const raw = await persistentStorage.get(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedScan[]) : [];
  } catch {
    return [];
  }
}

async function writeQueue(queue: QueuedScan[]): Promise<void> {
  await persistentStorage.set(QUEUE_KEY, JSON.stringify(queue));
  listeners.forEach((l) => {
    try {
      l(queue);
    } catch {
      // ignore listener errors
    }
  });
}

export const offlineScanQueue = {
  async addToQueue(input: {
    nfcId: string;
    merchantId?: string;
    userId: string;
  }): Promise<QueuedScan | null> {
    const queue = await readQueue();
    // Fraud prevention: max 1 pending scan per NFC chip
    const duplicate = queue.find(
      (s) =>
        s.nfcId.toLowerCase() === input.nfcId.toLowerCase() &&
        (s.status === 'pending' || s.status === 'syncing')
    );
    if (duplicate) return null;

    const scan: QueuedScan = {
      id: uuid(),
      nfcId: input.nfcId,
      merchantId: input.merchantId ?? '',
      userId: input.userId,
      timestamp: new Date().toISOString(),
      status: 'pending',
    };
    queue.push(scan);
    await writeQueue(queue);
    return scan;
  },

  async getQueue(): Promise<QueuedScan[]> {
    return readQueue();
  },

  async getPending(): Promise<QueuedScan[]> {
    const q = await readQueue();
    return q.filter((s) => s.status === 'pending' || s.status === 'syncing');
  },

  async getPendingCount(): Promise<number> {
    return (await this.getPending()).length;
  },

  async clearDone(): Promise<void> {
    const q = await readQueue();
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const filtered = q.filter((s) => {
      if (s.status === 'done' || s.status === 'failed') {
        return new Date(s.timestamp).getTime() > cutoff;
      }
      return true;
    });
    await writeQueue(filtered);
  },

  subscribe(listener: QueueListener): () => void {
    listeners.add(listener);
    // Push current state immediately
    readQueue().then((q) => {
      try {
        listener(q);
      } catch {
        // ignore
      }
    });
    return () => {
      listeners.delete(listener);
    };
  },

  /**
   * Replay every pending scan against the server. Server validation
   * (rate limiting, chip existence, anti-fraud) is unchanged.
   */
  async processQueue(): Promise<void> {
    if (processing) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    processing = true;
    try {
      const queue = await readQueue();
      const pending = queue.filter((s) => s.status === 'pending');
      if (pending.length === 0) return;

      for (const scan of pending) {
        // mark syncing
        scan.status = 'syncing';
        await writeQueue(queue);

        try {
          const { data, error } = await supabase.rpc('award_points_via_nfc', {
            p_hardware_uid: scan.nfcId,
            p_user_id: scan.userId,
          });
          if (error) throw error;

          const response = data as {
            success: boolean;
            points_awarded?: number;
            merchant_name?: string;
            merchant_customer_id?: string;
            error?: string;
          };

          if (response.success) {
            scan.status = 'done';
            scan.syncedAt = new Date().toISOString();
            scan.pointsAwarded = response.points_awarded;
            scan.merchantName = response.merchant_name;
          } else {
            scan.status = 'failed';
            scan.error = response.error || 'Server-Validierung fehlgeschlagen';
          }
        } catch (err: any) {
          // Network failure → revert to pending so we retry next time
          const msg = err?.message || '';
          if (msg.includes('fetch') || msg.includes('network') || msg.includes('Failed')) {
            scan.status = 'pending';
            break; // stop processing — we're offline again
          }
          scan.status = 'failed';
          scan.error = msg || 'Unbekannter Fehler';
        }
        await writeQueue(queue);
      }

      await this.clearDone();
    } finally {
      processing = false;
    }
  },
};
