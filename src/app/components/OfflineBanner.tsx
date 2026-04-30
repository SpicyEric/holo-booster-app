import { WifiOff, CloudUpload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNetworkStatus } from '@/app/hooks/useNetworkStatus';
import { offlineScanQueue } from '@/app/lib/offlineScanQueue';
import { AnimatePresence, motion } from 'framer-motion';

export const OfflineBanner = () => {
  const isOnline = useNetworkStatus();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const unsubscribe = offlineScanQueue.subscribe((queue) => {
      setPendingCount(queue.filter((s) => s.status === 'pending' || s.status === 'syncing').length);
    });
    return unsubscribe;
  }, []);

  if (isOnline) return null;

  const hasPending = pendingCount > 0;
  const bgClass = hasPending ? 'bg-amber-500' : 'bg-red-600';
  const Icon = hasPending ? CloudUpload : WifiOff;
  const text = hasPending
    ? `Offline – ${pendingCount} Scan${pendingCount === 1 ? '' : 's'} ${pendingCount === 1 ? 'wird' : 'werden'} synchronisiert sobald du wieder online bist`
    : 'Keine Internetverbindung';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className={`${bgClass} text-white text-center text-xs font-medium px-4 py-1.5 flex items-center justify-center gap-2 relative z-50`}
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <Icon className="h-3.5 w-3.5" />
        <span>{text}</span>
      </motion.div>
    </AnimatePresence>
  );
};
