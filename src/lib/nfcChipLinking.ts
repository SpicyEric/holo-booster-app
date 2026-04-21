import { supabase } from "@/integrations/supabase/client";

/**
 * Verknüpft alle bereits registrierten (verwaisten) NFC-Chips einer Stempel-ID
 * mit dem zugewiesenen Händler.
 *
 * Wichtig: Wir nutzen die SECURITY DEFINER RPC `claim_orphan_nfc_chips`,
 * weil die RLS-Policy auf `nfc_chips` ein direktes UPDATE durch den Händler
 * für noch nicht zugewiesene Chips (merchant_customer_id IS NULL) blockiert.
 *
 * Returns the number of updated chips (best-effort, never throws).
 */
export async function linkOrphanNfcChipsToMerchant(
  stempelId: string | null | undefined,
  merchantCustomerId: string,
): Promise<number> {
  if (!stempelId || !merchantCustomerId) return 0;

  try {
    const { data, error } = await supabase.rpc("claim_orphan_nfc_chips", {
      p_stempel_id: stempelId,
      p_merchant_customer_id: merchantCustomerId,
    });

    if (error) {
      console.warn("[linkOrphanNfcChipsToMerchant] RPC failed:", error);
      return 0;
    }
    return typeof data === "number" ? data : 0;
  } catch (e) {
    console.warn("[linkOrphanNfcChipsToMerchant] unexpected error:", e);
    return 0;
  }
}
