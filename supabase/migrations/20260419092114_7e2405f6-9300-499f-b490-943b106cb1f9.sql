ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_customers_is_demo ON public.customers(is_demo) WHERE is_demo = true;