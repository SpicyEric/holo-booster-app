ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS contact_person_phone text,
ADD COLUMN IF NOT EXISTS contact_person_email text;