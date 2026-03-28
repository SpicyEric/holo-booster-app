
-- Add employee_number as auto-incrementing
CREATE SEQUENCE IF NOT EXISTS sales_rep_employee_number_seq START WITH 1001;

ALTER TABLE public.sales_rep_profiles 
  ADD COLUMN IF NOT EXISTS employee_number integer UNIQUE DEFAULT nextval('sales_rep_employee_number_seq'),
  ADD COLUMN IF NOT EXISTS contract_file_path text,
  ADD COLUMN IF NOT EXISTS contract_uploaded_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS contract_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS contract_deadline timestamp with time zone,
  ADD COLUMN IF NOT EXISTS is_small_business boolean DEFAULT false;

-- Add update RLS policy for sales reps to edit their own profile
CREATE POLICY "Sales reps can update own profile"
  ON public.sales_rep_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Storage bucket for contracts
INSERT INTO storage.buckets (id, name, public)
VALUES ('sales-rep-contracts', 'sales-rep-contracts', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Sales reps can upload their contracts"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'sales-rep-contracts' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Sales reps can view their contracts"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'sales-rep-contracts' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Admins can view all contracts"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'sales-rep-contracts' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all contracts"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'sales-rep-contracts' AND public.has_role(auth.uid(), 'admin'));

-- Add RLS for customer_subscriptions so partners can see their own
CREATE POLICY "Partners can view subscriptions they created"
  ON public.customer_subscriptions
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());
