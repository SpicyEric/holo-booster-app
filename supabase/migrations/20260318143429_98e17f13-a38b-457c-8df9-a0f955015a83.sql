
-- Allow merchants (via merchant_assignments) to manage rewards for their assigned customers
CREATE POLICY "Merchants via assignments can manage rewards"
ON public.rewards
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1 FROM merchant_assignments
    WHERE merchant_assignments.merchant_user_id = auth.uid()
    AND merchant_assignments.customer_id = rewards.merchant_customer_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM merchant_assignments
    WHERE merchant_assignments.merchant_user_id = auth.uid()
    AND merchant_assignments.customer_id = rewards.merchant_customer_id
  )
);
