ALTER TABLE public.customers
  ADD COLUMN cancelled_at timestamptz DEFAULT NULL;