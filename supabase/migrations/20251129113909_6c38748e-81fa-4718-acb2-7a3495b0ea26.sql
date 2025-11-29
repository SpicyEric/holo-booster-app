-- Add merchant profile columns to customers table
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
ADD COLUMN IF NOT EXISTS street TEXT,
ADD COLUMN IF NOT EXISTS house_number TEXT,
ADD COLUMN IF NOT EXISTS postal_code TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS opening_hours JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS instagram TEXT,
ADD COLUMN IF NOT EXISTS facebook TEXT,
ADD COLUMN IF NOT EXISTS twitter TEXT,
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add RLS policy for merchants to update their own customer record
CREATE POLICY "Merchants can update their assigned customers"
ON public.customers
FOR UPDATE
USING (
  has_role(auth.uid(), 'merchant'::app_role) 
  AND EXISTS (
    SELECT 1 FROM merchant_assignments 
    WHERE merchant_assignments.merchant_user_id = auth.uid() 
    AND merchant_assignments.customer_id = customers.id
  )
)
WITH CHECK (
  has_role(auth.uid(), 'merchant'::app_role) 
  AND EXISTS (
    SELECT 1 FROM merchant_assignments 
    WHERE merchant_assignments.merchant_user_id = auth.uid() 
    AND merchant_assignments.customer_id = customers.id
  )
);