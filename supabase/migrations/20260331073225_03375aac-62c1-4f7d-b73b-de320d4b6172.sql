
CREATE TABLE public.merchant_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  badge_key text NOT NULL,
  earned_at timestamp with time zone NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}',
  UNIQUE(customer_id, badge_key)
);

ALTER TABLE public.merchant_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can view their own badges"
ON public.merchant_badges FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM customer_users
    WHERE customer_users.customer_id = merchant_badges.customer_id
    AND customer_users.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM merchant_assignments
    WHERE merchant_assignments.customer_id = merchant_badges.customer_id
    AND merchant_assignments.merchant_user_id = auth.uid()
  )
);

CREATE POLICY "System can insert badges"
ON public.merchant_badges FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Admins can manage all badges"
ON public.merchant_badges FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
