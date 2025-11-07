-- Add 'customer' role to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'customer';

-- Create customer_users table to link auth users to customers
CREATE TABLE IF NOT EXISTS public.customer_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, customer_id)
);

-- Enable RLS on customer_users
ALTER TABLE public.customer_users ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all customer_users
CREATE POLICY "Admins can view all customer_users"
ON public.customer_users
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Policy: Customers can view their own links
CREATE POLICY "Customers can view their own customer_users"
ON public.customer_users
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Admins can insert customer_users
CREATE POLICY "Admins can insert customer_users"
ON public.customer_users
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Policy: Customers can view their own customer data
CREATE POLICY "Customers can view their own customer"
ON public.customers
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.customer_users
    WHERE customer_users.customer_id = customers.id
    AND customer_users.user_id = auth.uid()
  )
);

-- Policy: Customers can view their own invoices
CREATE POLICY "Customers can view their own invoices"
ON public.invoices
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.customer_users
    WHERE customer_users.customer_id = invoices.customer_id
    AND customer_users.user_id = auth.uid()
  )
);