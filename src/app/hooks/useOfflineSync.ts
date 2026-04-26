import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { offlineQueueService, PendingStamp } from '@/app/services/offlineQueueService';
import { useNetworkStatus } from './useNetworkStatus';
import { toast } from 'sonner';
import { maybeAwardReferralBonus } from '@/app/lib/referralBonus';

/**
 * Hook that automatically syncs pending offline stamps when internet is restored.
 * Should be mounted once in the app layout.
 */
export const useOfflineSync = () => {
  const isOnline = useNetworkStatus();
  const syncingRef = useRef(false);

  const syncPendingStamps = useCallback(async () => {
    if (syncingRef.current) return;
    
    const pending = offlineQueueService.getPendingStamps();
    if (pending.length === 0) return;

    syncingRef.current = true;
    console.log(`[OfflineSync] Syncing ${pending.length} pending stamps...`);

    for (const stamp of pending) {
      try {
        const { data, error } = await supabase.rpc('award_points_via_nfc', {
          p_chip_data: '',
          p_hardware_uid: stamp.hardwareUid,
          p_user_id: stamp.userId,
        });

        if (error) throw error;

        const response = data as { success: boolean; points_awarded?: number; merchant_name?: string; error?: string };

        if (response.success) {
          offlineQueueService.markSynced(stamp.id);
          toast.success(`Offline-Stempel synchronisiert: +${response.points_awarded} Punkte`);
        } else {
          offlineQueueService.markError(stamp.id, response.error || 'Unbekannter Fehler');
          toast.error(`Offline-Stempel abgelehnt: ${response.error}`);
        }
      } catch (err: any) {
        console.error('[OfflineSync] Sync error for stamp:', stamp.id, err);
        // Don't mark as error on network failures - will retry next time
        if (!err.message?.includes('fetch') && !err.message?.includes('network')) {
          offlineQueueService.markError(stamp.id, err.message);
        }
      }
    }

    offlineQueueService.cleanup();
    syncingRef.current = false;
  }, []);

  // Sync when coming back online
  useEffect(() => {
    if (isOnline) {
      // Small delay to let network stabilize
      const timer = setTimeout(syncPendingStamps, 2000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, syncPendingStamps]);

  // Also try syncing periodically when online
  useEffect(() => {
    if (!isOnline) return;
    const interval = setInterval(syncPendingStamps, 30000); // every 30s
    return () => clearInterval(interval);
  }, [isOnline, syncPendingStamps]);

  return { syncPendingStamps };
};
