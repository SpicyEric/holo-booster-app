-- Add stamp card configuration to customers table
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS stamps_required integer DEFAULT 5,
ADD COLUMN IF NOT EXISTS stamp_reward_text text DEFAULT 'Gratis Kaffee';

-- Create stamps table for tracking customer stamps
CREATE TABLE IF NOT EXISTS public.stamps (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  phone text NOT NULL,
  stamp_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(customer_id, phone, stamp_date)
);

-- Enable RLS
ALTER TABLE public.stamps ENABLE ROW LEVEL SECURITY;

-- Admins can view all stamps
CREATE POLICY "Admins can view all stamps"
ON public.stamps
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
);

-- Merchants can view stamps of assigned customers
CREATE POLICY "Merchants can view stamps of assigned customers"
ON public.stamps
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'merchant'::app_role) 
  AND EXISTS (
    SELECT 1 FROM merchant_assignments
    WHERE merchant_assignments.merchant_user_id = auth.uid()
    AND merchant_assignments.customer_id = stamps.customer_id
  )
);

-- Public can insert stamps (through edge function)
CREATE POLICY "Public can insert stamps"
ON public.stamps
FOR INSERT
TO anon
WITH CHECK (true);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_stamps_customer_phone ON public.stamps(customer_id, phone);
CREATE INDEX IF NOT EXISTS idx_stamps_date ON public.stamps(stamp_date);