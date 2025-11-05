-- Allow public read access to active customers (needed for scan page)
CREATE POLICY "Public can view active customers"
ON public.customers
FOR SELECT
USING (active = true);