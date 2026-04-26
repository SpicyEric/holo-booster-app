import { supabase } from '@/integrations/supabase/client';

/**
 * Prüft nach einem Stempel, ob eine aktive Neukundenprämie für diesen Händler existiert
 * und ob diese noch nicht für den User als "freigeschaltet" markiert wurde.
 * Wenn ja: legt eine point_transaction vom Typ 'new_customer_offer_unlocked' an (0 Punkte).
 *
 * Idempotent — kann mehrfach aufgerufen werden, fügt aber nur einmal pro User+Merchant ein.
 */
export async function maybeUnlockNewCustomerOffer(params: {
  userId: string;
  merchantCustomerId: string;
}): Promise<{
  unlocked: boolean;
  offer?: { id: string; title: string; description: string | null };
}> {
  const { userId, merchantCustomerId } = params;
  if (!userId || !merchantCustomerId) return { unlocked: false };

  try {
    // 1. Aktives Neukundenangebot vorhanden?
    const { data: offer } = await supabase
      .from('new_customer_offers')
      .select('id, title, description')
      .eq('merchant_customer_id', merchantCustomerId)
      .eq('is_active', true)
      .maybeSingle();

    if (!offer) return { unlocked: false };

    // 2. Loyalty-Konto laden
    const { data: account } = await supabase
      .from('loyalty_accounts')
      .select('id')
      .eq('user_id', userId)
      .eq('merchant_customer_id', merchantCustomerId)
      .maybeSingle();

    if (!account) return { unlocked: false };

    // 3. Bereits freigeschaltet?
    const { data: existing } = await supabase
      .from('point_transactions')
      .select('id')
      .eq('loyalty_account_id', account.id)
      .eq('transaction_type', 'new_customer_offer_unlocked')
      .limit(1)
      .maybeSingle();

    if (existing) return { unlocked: false };

    // 4. Transaktion eintragen
    const { error } = await supabase.from('point_transactions').insert({
      loyalty_account_id: account.id,
      merchant_customer_id: merchantCustomerId,
      points_change: 0,
      transaction_type: 'new_customer_offer_unlocked',
      description: `Neukundenprämie freigeschaltet: ${offer.title}`,
    });

    if (error) {
      console.error('[NewCustomerOffer] insert tx error:', error);
      return { unlocked: false };
    }

    return { unlocked: true, offer };
  } catch (err) {
    console.error('[NewCustomerOffer] unlock error:', err);
    return { unlocked: false };
  }
}
