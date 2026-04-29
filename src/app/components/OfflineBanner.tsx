import { WifiOff } from 'lucide-react';
import { useNetworkStatus } from '@/app/hooks/useNetworkStatus';
import { offlineQueueService } from '@/app/services/offlineQueueService';
import { AnimatePresence, motion } from 'framer-motion';

export const OfflineBanner = () => {
  const isOnline = useNetworkStatus();
  const pendingCount = offlineQueueService.getPendingCount();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-amber-500 text-white text-center text-xs font-medium px-4 py-1.5 flex items-center justify-center gap-2 relative z-50"
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
          <WifiOff className="h-3.5 w-3.5" />
          <span>
            Kein Internet – eingeschränkter Modus
            {pendingCount > 0 && ` (${pendingCount} Karte ausstehend)`}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
