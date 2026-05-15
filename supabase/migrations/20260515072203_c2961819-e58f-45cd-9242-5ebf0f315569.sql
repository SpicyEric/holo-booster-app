-- Restrict public read access on customers: require authentication
DROP POLICY IF EXISTS "Public can view active customers" ON public.customers;

CREATE POLICY "Authenticated users can view active customers"
ON public.customers
FOR SELECT
TO authenticated
USING (active = true);