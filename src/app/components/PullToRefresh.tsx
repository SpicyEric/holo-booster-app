import { useState, useRef, useCallback, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
}

export const PullToRefresh = ({ onRefresh, children, className = '' }: PullToRefreshProps) => {
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const isPulling = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const threshold = 80;

  const getScrollParent = useCallback(() => {
    let el = containerRef.current?.parentElement;
    while (el) {
      const style = window.getComputedStyle(el);
      if (style.overflowY === 'auto' || style.overflowY === 'scroll') return el;
      el = el.parentElement;
    }
    return null;
  }, []);

  // Use refs for callbacks to avoid stale closures in event listeners
  const refreshingRef = useRef(refreshing);
  refreshingRef.current = refreshing;
  const pullDistanceRef = useRef(pullDistance);
  pullDistanceRef.current = pullDistance;
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (refreshingRef.current) return;
      const scrollParent = getScrollParent();
      if (scrollParent && scrollParent.scrollTop > 5) return;
      startY.current = e.touches[0].clientY;
      isPulling.current = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling.current || refreshingRef.current) return;
      const scrollParent = getScrollParent();
      if (scrollParent && scrollParent.scrollTop > 5) {
        isPulling.current = false;
        setPullDistance(0);
        return;
      }
      const currentY = e.touches[0].clientY;
      const diff = currentY - startY.current;
      if (diff > 0) {
        // Prevent default scroll when pulling down from top
        if (!scrollParent || scrollParent.scrollTop <= 0) {
          e.preventDefault();
        }
        setPullDistance(Math.min(diff * 0.4, threshold * 1.5));
      } else {
        isPulling.current = false;
        setPullDistance(0);
      }
    };

    const handleTouchEnd = async () => {
      if (!isPulling.current) return;
      isPulling.current = false;
      if (pullDistanceRef.current >= threshold && !refreshingRef.current) {
        setRefreshing(true);
        setPullDistance(threshold * 0.5);
        try {
          await onRefreshRef.current();
        } finally {
          setRefreshing(false);
          setPullDistance(0);
        }
      } else {
        setPullDistance(0);
      }
    };

    // Use non-passive listeners so preventDefault works
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [getScrollParent]);

  return (
    <div
      ref={containerRef}
      className={className}
    >
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-all duration-200"
        style={{ height: pullDistance > 0 ? pullDistance : 0, opacity: pullDistance > 10 ? 1 : 0 }}
      >
        <div className={`transition-transform ${refreshing ? 'animate-spin' : ''}`}
          style={{ transform: !refreshing ? `rotate(${Math.min(pullDistance / threshold, 1) * 360}deg)` : undefined }}
        >
          <Loader2 className="h-6 w-6 text-primary" />
        </div>
      </div>
      {children}
    </div>
  );
};
