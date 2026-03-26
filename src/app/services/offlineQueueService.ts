/**
 * Offline Queue Service
 * Manages offline NFC stamp queue with fraud prevention.
 * Max 1 pending stamp per hardware UID until synced.
 * Identification is based solely on hardware UID (TAG-only mode).
 */

const QUEUE_KEY = 'eloyo_offline_stamp_queue';
const CACHE_KEY_PREFIX = 'eloyo_cache_';

export interface PendingStamp {
  id: string;
  hardwareUid: string;
  userId: string;
  timestamp: number;
  synced: boolean;
  error?: string;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function getQueue(): PendingStamp[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: PendingStamp[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export const offlineQueueService = {
  /**
   * Check if there's already a pending (unsynced) stamp for the same hardware UID
   */
  hasPendingStampForUid(hardwareUid: string): boolean {
    if (!hardwareUid) return false;
    const queue = getQueue();
    return queue.some(s => !s.synced && !s.error && s.hardwareUid.toLowerCase() === hardwareUid.toLowerCase());
  },

  /**
   * Add a stamp to the offline queue. Returns the pending stamp or null if blocked.
   */
  addStamp(hardwareUid: string, userId: string): PendingStamp | null {
    // Fraud prevention: max 1 pending stamp per hardware UID
    if (this.hasPendingStampForUid(hardwareUid)) {
      return null;
    }

    const stamp: PendingStamp = {
      id: generateId(),
      hardwareUid,
      userId,
      timestamp: Date.now(),
      synced: false,
    };

    const queue = getQueue();
    queue.push(stamp);
    saveQueue(queue);
    return stamp;
  },

  /**
   * Get all unsynced stamps
   */
  getPendingStamps(): PendingStamp[] {
    return getQueue().filter(s => !s.synced && !s.error);
  },

  /**
   * Mark a stamp as synced (successfully processed)
   */
  markSynced(stampId: string) {
    const queue = getQueue();
    const idx = queue.findIndex(s => s.id === stampId);
    if (idx !== -1) {
      queue[idx].synced = true;
      saveQueue(queue);
    }
  },

  /**
   * Mark a stamp as errored (rejected by server)
   */
  markError(stampId: string, error: string) {
    const queue = getQueue();
    const idx = queue.findIndex(s => s.id === stampId);
    if (idx !== -1) {
      queue[idx].error = error;
      saveQueue(queue);
    }
  },

  /**
   * Remove synced/errored stamps older than 24h
   */
  cleanup() {
    const queue = getQueue();
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const filtered = queue.filter(s => {
      if (s.synced || s.error) return s.timestamp > cutoff;
      return true; // keep unsynced stamps
    });
    saveQueue(filtered);
  },

  /**
   * Get count of pending stamps
   */
  getPendingCount(): number {
    return this.getPendingStamps().length;
  },
};

/**
 * Generic data cache for offline viewing
 */
export const offlineCacheService = {
  set(key: string, data: any) {
    try {
      localStorage.setItem(CACHE_KEY_PREFIX + key, JSON.stringify({
        data,
        cachedAt: Date.now(),
      }));
    } catch {
      // Storage full - ignore
    }
  },

  get<T>(key: string, maxAgeMs: number = 24 * 60 * 60 * 1000): T | null {
    try {
      const raw = localStorage.getItem(CACHE_KEY_PREFIX + key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (Date.now() - parsed.cachedAt > maxAgeMs) return null;
      return parsed.data as T;
    } catch {
      return null;
    }
  },

  remove(key: string) {
    localStorage.removeItem(CACHE_KEY_PREFIX + key);
  },
};