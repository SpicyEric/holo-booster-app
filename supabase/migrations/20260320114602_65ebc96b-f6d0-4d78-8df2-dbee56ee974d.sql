
-- Create merchant_boosts table
CREATE TABLE public.merchant_boosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  tier text NOT NULL, -- '3_days', '7_days', '14_days'
  duration_days integer NOT NULL,
  starts_at timestamp with time zone NOT NULL DEFAULT now(),
  ends_at timestamp with time zone NOT NULL,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'active', 'expired', 'cancelled'
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by_user_id uuid
);

-- Enable RLS
ALTER TABLE public.merchant_boosts ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage all boosts" ON public.merchant_boosts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Merchants can view their own boosts
CREATE POLICY "Merchants can view their boosts" ON public.merchant_boosts
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM merchant_assignments
    WHERE merchant_assignments.merchant_user_id = auth.uid()
      AND merchant_assignments.customer_id = merchant_boosts.merchant_customer_id
  ));

-- Merchants can insert boosts for their business
CREATE POLICY "Merchants can insert boosts" ON public.merchant_boosts
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM merchant_assignments
    WHERE merchant_assignments.merchant_user_id = auth.uid()
      AND merchant_assignments.customer_id = merchant_boosts.merchant_customer_id
  ));

-- Anyone can read active boosts (needed for feed)
CREATE POLICY "Anyone can view active boosts" ON public.merchant_boosts
  FOR SELECT TO authenticated
  USING (status = 'active' AND ends_at > now());
