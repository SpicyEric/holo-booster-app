-- 1) Add pass_length column to customers
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS pass_length integer NOT NULL DEFAULT 15;

-- 2) reward_placements table
CREATE TABLE IF NOT EXISTS public.reward_placements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  reward_id uuid NOT NULL,
  visit integer NOT NULL CHECK (visit >= 1),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (customer_id, visit)
);

CREATE INDEX IF NOT EXISTS idx_reward_placements_customer ON public.reward_placements(customer_id);
CREATE INDEX IF NOT EXISTS idx_reward_placements_reward ON public.reward_placements(reward_id);

ALTER TABLE public.reward_placements ENABLE ROW LEVEL SECURITY;

-- Admins manage all
CREATE POLICY "Admins can manage all reward_placements"
ON public.reward_placements
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can read (needed for the app to render loyalty pass)
CREATE POLICY "Anyone can view reward_placements"
ON public.reward_placements
FOR SELECT
USING (true);

-- Merchants linked via customer_users can manage placements of their customer
CREATE POLICY "Customer users can manage placements"
ON public.reward_placements
FOR ALL
USING (EXISTS (
  SELECT 1 FROM customer_users cu
  WHERE cu.customer_id = reward_placements.customer_id
    AND cu.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM customer_users cu
  WHERE cu.customer_id = reward_placements.customer_id
    AND cu.user_id = auth.uid()
));

-- Merchants assigned via merchant_assignments can also manage
CREATE POLICY "Assigned merchants can manage placements"
ON public.reward_placements
FOR ALL
USING (EXISTS (
  SELECT 1 FROM merchant_assignments ma
  WHERE ma.customer_id = reward_placements.customer_id
    AND ma.merchant_user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM merchant_assignments ma
  WHERE ma.customer_id = reward_placements.customer_id
    AND ma.merchant_user_id = auth.uid()
));