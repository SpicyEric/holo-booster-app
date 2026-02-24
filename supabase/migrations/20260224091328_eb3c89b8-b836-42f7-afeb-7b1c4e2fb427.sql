
ALTER TABLE public.customers
ADD COLUMN stamp_mode text DEFAULT 'classic',
ADD COLUMN avg_revenue integer DEFAULT 7,
ADD COLUMN manual_stamp_mode boolean DEFAULT false;
