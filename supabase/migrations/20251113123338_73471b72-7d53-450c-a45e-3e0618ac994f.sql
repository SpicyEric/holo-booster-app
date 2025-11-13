-- Add Google OAuth columns to customers table
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS google_access_token TEXT,
ADD COLUMN IF NOT EXISTS google_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS google_token_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS google_business_name TEXT;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_review_deletion_orders_updated_at ON public.review_deletion_orders;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can view deletion orders" ON public.review_deletion_orders;
DROP POLICY IF EXISTS "Authenticated users can create deletion orders" ON public.review_deletion_orders;
DROP POLICY IF EXISTS "Authenticated users can update deletion orders" ON public.review_deletion_orders;
DROP POLICY IF EXISTS "Authenticated users can view deletion results" ON public.review_deletion_results;
DROP POLICY IF EXISTS "Authenticated users can insert deletion results" ON public.review_deletion_results;
DROP POLICY IF EXISTS "Authenticated users can update deletion results" ON public.review_deletion_results;

-- RLS Policies - Allow authenticated users full access for now
CREATE POLICY "Authenticated users can view deletion orders"
  ON public.review_deletion_orders
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create deletion orders"
  ON public.review_deletion_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update deletion orders"
  ON public.review_deletion_orders
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view deletion results"
  ON public.review_deletion_results
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert deletion results"
  ON public.review_deletion_results
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update deletion results"
  ON public.review_deletion_results
  FOR UPDATE
  TO authenticated
  USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_review_deletion_orders_updated_at
  BEFORE UPDATE ON public.review_deletion_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();