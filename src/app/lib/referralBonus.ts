import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ReferralBonusResult {
  processed?: boolean;
  bonus_awarded?: boolean;
  inviter_points?: number;
  invitee_points?: number;
  inviter_user_id?: string;
  invitee_user_id?: string;
  merchant_customer_id?: string;
}

// Bug-Fix Bug 2: Client-side Guard. Verhindert, dass parallele Scan-Pfade
// (AppScan.tsx + useNewCustomerOfferRedemption.ts) gleichzeitig den
// Referral-Bonus auszahlen und doppelte Push-Notifications triggern.
// Speichert pro Tab/Session: user+merchant -> in-flight Promise.
const inFlightCalls = new Map<string, Promise<ReferralBonusResult | null>>();
const recentlyProcessed = new Map<string, number>();
const RECENT_TTL_MS = 30_000; // 30 Sekunden

/**
 * Prüft nach einem erfolgreichen Karte/Punkte-Vorgang, ob für diesen User
 * eine offene Einladung beim aktuellen Händler existiert. Falls ja wird der
 * Empfehlungs-Bonus für Inviter & Invitee ausgezahlt und beide via Push
 * benachrichtigt. Wirft niemals — schlägt still fehl, damit der Stempelvorgang
 * niemals durch Bonus-Probleme beeinträchtigt wird.
 */
export async function maybeAwardReferralBonus(params: {
  userId: string;
  merchantCustomerId: string;
  showToast?: boolean;
}): Promise<ReferralBonusResult | null> {
  const { userId, merchantCustomerId, showToast = true } = params;
  if (!userId || !merchantCustomerId) return null;

  const key = `${userId}:${merchantCustomerId}`;

  // Wenn vor kurzem schon erfolgreich verarbeitet → skip
  const recentTs = recentlyProcessed.get(key);
  if (recentTs && Date.now() - recentTs < RECENT_TTL_MS) {
    console.log('[referralBonus] skipping — recently processed for', key);
    return null;
  }

  // Wenn aktuell in-flight → bestehenden Promise zurückgeben (kein zweiter RPC-Call)
  const existing = inFlightCalls.get(key);
  if (existing) {
    console.log('[referralBonus] reusing in-flight call for', key);
    return existing;
  }

  const promise = (async (): Promise<ReferralBonusResult | null> => {
    try {
      const { data, error } = await supabase.rpc('process_referral_bonus', {
        p_user_id: userId,
        p_merchant_customer_id: merchantCustomerId,
      });
      if (error) {
        console.warn('[referralBonus] process_referral_bonus error:', error);
        return null;
      }

      const ref = data as ReferralBonusResult | null;
      if (ref?.processed) {
        recentlyProcessed.set(key, Date.now());
      }
      if (!ref?.bonus_awarded) return ref;

      if (showToast) {
        const isInviter = ref.inviter_user_id === userId;
        const bonus = isInviter ? ref.inviter_points : ref.invitee_points;
        toast.success(`🎉 Empfehlungs-Bonus: +${bonus} Punkte!`, { duration: 5000 });
      }

      // Push-Notifications an beide Beteiligte (best-effort)
      try {
        await supabase.functions.invoke('notify-referral-bonus', {
          body: {
            inviter_user_id: ref.inviter_user_id,
            invitee_user_id: ref.invitee_user_id,
            inviter_points: ref.inviter_points,
            invitee_points: ref.invitee_points,
            merchant_customer_id: ref.merchant_customer_id ?? merchantCustomerId,
          },
        });
      } catch (pushErr) {
        console.warn('[referralBonus] notify-referral-bonus failed:', pushErr);
      }

      return ref;
    } catch (err) {
      console.warn('[referralBonus] unexpected error:', err);
      return null;
    } finally {
      // Nach kurzer Wartezeit aus inFlight entfernen, damit Folge-Scans wieder gehen
      setTimeout(() => inFlightCalls.delete(key), 1000);
    }
  })();

  inFlightCalls.set(key, promise);
  return promise;
}

