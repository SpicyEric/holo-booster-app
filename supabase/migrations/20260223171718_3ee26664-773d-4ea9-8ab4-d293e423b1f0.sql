-- Allow merchants to view point_transactions for their business
CREATE POLICY "Merchants can view transactions for their business"
ON public.point_transactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM customer_users
    WHERE customer_users.customer_id = point_transactions.merchant_customer_id
      AND customer_users.user_id = auth.uid()
  )
);

-- Allow merchants to view reward_redemptions for their business
CREATE POLICY "Merchants can view redemptions for their business"
ON public.reward_redemptions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM customer_users
    WHERE customer_users.customer_id = reward_redemptions.merchant_customer_id
      AND customer_users.user_id = auth.uid()
  )
);

-- Allow merchants to view profiles of their loyalty users (for demographics)
CREATE POLICY "Merchants can view profiles of their loyalty users"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM loyalty_accounts la
    JOIN customer_users cu ON cu.customer_id = la.merchant_customer_id
    WHERE la.user_id = profiles.user_id
      AND cu.user_id = auth.uid()
  )
);