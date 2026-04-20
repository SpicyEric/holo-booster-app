import { supabase } from "@/integrations/supabase/client";

/**
 * Verknüpft alle bereits registrierten NFC-Chips einer Stempel-ID
 * mit dem zugewiesenen Händler. Wird nach jeder Box→Händler-Zuweisung
 * aufgerufen, um den Fall abzudecken, dass die Stempel zuerst registriert
 * und die Box erst danach einem Händler zugewiesen wurde.
 *
 * Returns the number of updated chips (best-effort, never throws).
 */
export async function linkOrphanNfcChipsToMerchant(
  stempelId: string | null | undefined,
  merchantCustomerId: string,
): Promise<number> {
  if (!stempelId || !merchantCustomerId) return 0;

  try {
    const { data, error } = await supabase
      .from("nfc_chips")
      .update({ merchant_customer_id: merchantCustomerId })
      .eq("chip_uid", stempelId.toUpperCase())
      .is("merchant_customer_id", null)
      .select("id");

    if (error) {
      console.warn("[linkOrphanNfcChipsToMerchant] update failed:", error);
      return 0;
    }
    return data?.length ?? 0;
  } catch (e) {
    console.warn("[linkOrphanNfcChipsToMerchant] unexpected error:", e);
    return 0;
  }
}
