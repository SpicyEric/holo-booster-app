import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const PUSH_LIMIT = 2;

/**
 * Calculate the current billing cycle window based on subscription start_date.
 * The cycle resets on the same day-of-month as the subscription started.
 */
function getBillingCycleWindow(subscriptionStartDate: string): { cycleStart: Date; cycleEnd: Date } {
  const startDate = new Date(subscriptionStartDate);
  const startDay = startDate.getDate();
  const now = new Date();

  // Find the most recent cycle start (same day-of-month as subscription start)
  let cycleStart = new Date(now.getFullYear(), now.getMonth(), startDay);
  
  // If the cycle start is in the future, go back one month
  if (cycleStart > now) {
    cycleStart = new Date(now.getFullYear(), now.getMonth() - 1, startDay);
  }

  // Cycle end is one month after cycle start
  const cycleEnd = new Date(cycleStart.getFullYear(), cycleStart.getMonth() + 1, startDay);

  return { cycleStart, cycleEnd };
}

export interface PushLimitInfo {
  loading: boolean;
  pushesUsed: number;
  pushLimit: number;
  remaining: number;
  isLimitReached: boolean;
  resetDate: Date | null;
  /** Call after successfully sending a push broadcast */
  recordPushSend: (merchantCustomerId: string) => Promise<void>;
  /** Re-fetch current usage */
  refresh: () => Promise<void>;
}

export function usePushLimit(customerId: string | null): PushLimitInfo {
  const [loading, setLoading] = useState(true);
  const [pushesUsed, setPushesUsed] = useState(0);
  const [resetDate, setResetDate] = useState<Date | null>(null);

  const fetchUsage = useCallback(async () => {
    if (!customerId) {
      setLoading(false);
      return;
    }

    try {
      // Get subscription start date for this customer
      const { data: sub } = await supabase
        .from('customer_subscriptions')
        .select('start_date')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Fallback: use customer created_at if no subscription
      let startDateStr = sub?.start_date;
      if (!startDateStr) {
        const { data: customer } = await supabase
          .from('customers')
          .select('created_at')
          .eq('id', customerId)
          .maybeSingle();
        startDateStr = customer?.created_at;
      }

      if (!startDateStr) {
        setLoading(false);
        return;
      }

      const { cycleStart, cycleEnd } = getBillingCycleWindow(startDateStr);
      setResetDate(cycleEnd);

      // Count push sends in current cycle
      const { count, error } = await supabase
        .from('merchant_push_log')
        .select('id', { count: 'exact', head: true })
        .eq('merchant_customer_id', customerId)
        .gte('sent_at', cycleStart.toISOString())
        .lt('sent_at', cycleEnd.toISOString());

      if (error) throw error;
      setPushesUsed(count || 0);
    } catch (err) {
      console.error('Error fetching push limit:', err);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  const recordPushSend = useCallback(async (merchantCustomerId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('merchant_push_log').insert({
      merchant_customer_id: merchantCustomerId,
      sent_by_user_id: user.id,
    } as any);

    setPushesUsed(prev => prev + 1);
  }, []);

  const remaining = Math.max(0, PUSH_LIMIT - pushesUsed);

  return {
    loading,
    pushesUsed,
    pushLimit: PUSH_LIMIT,
    remaining,
    isLimitReached: pushesUsed >= PUSH_LIMIT,
    resetDate,
    recordPushSend,
    refresh: fetchUsage,
  };
}
