-- Add box_id column to customers table
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS box_id text;

-- Add comment for documentation
COMMENT ON COLUMN public.customers.box_id IS 'The unique Box ID associated with the customer Starterbox';