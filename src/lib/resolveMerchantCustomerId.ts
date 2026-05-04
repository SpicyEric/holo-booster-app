import { supabase } from "@/integrations/supabase/client";
import { isDemoMerchantActive, getDemoMerchantCustomerId } from "@/lib/demoMerchant";

/**
 * Resolves the active customer (merchant) ID for a logged-in user.
 *
 * - In Demo-Merchant mode this always returns the fixed Demo customer
 *   so admins/sales reps can browse the merchant UI as that account.
 * - Otherwise it looks up the assignment via `merchant_assignments`,
 *   falling back to `customer_users`.
 */
export async function resolveMerchantCustomerId(userId: string | undefined | null): Promise<string | null> {
  if (isDemoMerchantActive()) {
    return getDemoMerchantCustomerId();
  }
  if (!userId) return null;

  const { data: assignment } = await supabase
    .from("merchant_assignments")
    .select("customer_id")
    .eq("merchant_user_id", userId)
    .maybeSingle();
  if (assignment?.customer_id) return assignment.customer_id;

  const { data: link } = await supabase
    .from("customer_users")
    .select("customer_id")
    .eq("user_id", userId)
    .maybeSingle();
  return link?.customer_id ?? null;
}
