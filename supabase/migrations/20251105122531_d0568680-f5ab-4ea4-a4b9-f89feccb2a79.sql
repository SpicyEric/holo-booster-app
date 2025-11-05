-- Add new fields to customers table
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS industry TEXT,
ADD COLUMN IF NOT EXISTS contact_person TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS design_urls TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Update existing customers to use name as company_name if company_name is null
UPDATE public.customers
SET company_name = name
WHERE company_name IS NULL;