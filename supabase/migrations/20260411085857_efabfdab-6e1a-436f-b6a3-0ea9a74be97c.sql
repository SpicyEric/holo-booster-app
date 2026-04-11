ALTER TABLE public.sales_rep_profiles
  ADD COLUMN first_conversion_at timestamptz DEFAULT NULL,
  ADD COLUMN last_conversion_at timestamptz DEFAULT NULL;