ALTER TABLE public.commissions 
  ADD COLUMN IF NOT EXISTS available_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS discount_cents integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS customer_name text;