
-- Fix loyalty_accounts SELECT policies: change from RESTRICTIVE to PERMISSIVE
DROP POLICY IF EXISTS "Admins can view all loyalty accounts" ON public.loyalty_accounts;
DROP POLICY IF EXISTS "End customers can view their own loyalty accounts" ON public.loyalty_accounts;
DROP POLICY IF EXISTS "Merchants can view loyalty accounts for their business" ON public.loyalty_accounts;

CREATE POLICY "Admins can view all loyalty accounts"
ON public.loyalty_accounts FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "End customers can view their own loyalty accounts"
ON public.loyalty_accounts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Merchants can view loyalty accounts for their business"
ON public.loyalty_accounts FOR SELECT
USING (EXISTS (
  SELECT 1 FROM customer_users
  WHERE customer_users.customer_id = loyalty_accounts.merchant_customer_id
    AND customer_users.user_id = auth.uid()
));
