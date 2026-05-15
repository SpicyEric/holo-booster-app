DROP POLICY IF EXISTS "Authenticated users can view deletion orders" ON public.review_deletion_orders;
DROP POLICY IF EXISTS "Authenticated users can update deletion orders" ON public.review_deletion_orders;

-- Allow customer owners to update their own orders (scoped)
CREATE POLICY "Customers can update their own deletion orders"
ON public.review_deletion_orders
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM customer_users
  WHERE customer_users.customer_id = review_deletion_orders.customer_id
    AND customer_users.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM customer_users
  WHERE customer_users.customer_id = review_deletion_orders.customer_id
    AND customer_users.user_id = auth.uid()
));