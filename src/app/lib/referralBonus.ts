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

/**
 * Prüft nach einem erfolgreichen Stempel/Punkte-Vorgang, ob für diesen User
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
  }
}
