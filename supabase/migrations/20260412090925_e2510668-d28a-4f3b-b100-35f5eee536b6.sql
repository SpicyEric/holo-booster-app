
CREATE TABLE public.merchant_push_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  sent_by_user_id UUID NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.merchant_push_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all push logs"
  ON public.merchant_push_log FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Merchants can view their push logs"
  ON public.merchant_push_log FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM customer_users
    WHERE customer_users.customer_id = merchant_push_log.merchant_customer_id
      AND customer_users.user_id = auth.uid()
  ));

CREATE POLICY "Merchants can insert their push logs"
  ON public.merchant_push_log FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM customer_users
    WHERE customer_users.customer_id = merchant_push_log.merchant_customer_id
      AND customer_users.user_id = auth.uid()
  ));

CREATE INDEX idx_merchant_push_log_merchant ON public.merchant_push_log (merchant_customer_id, sent_at);
