ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS version text NOT NULL DEFAULT 'v1',
  ADD COLUMN IF NOT EXISTS brand_color text;

UPDATE public.customers
SET version = 'v2',
    brand_color = '#FF6B35'
WHERE id = 'e828d21a-f7c5-4c8e-bc8d-6301e3e3ab45';