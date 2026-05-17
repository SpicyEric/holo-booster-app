
-- ============================================================
-- Aufsteller: Requests + Designs
-- ============================================================

CREATE TABLE public.aufsteller_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_by_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_aufsteller_requests_customer ON public.aufsteller_requests(customer_id);
CREATE INDEX idx_aufsteller_requests_status ON public.aufsteller_requests(status);

ALTER TABLE public.aufsteller_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can view their own aufsteller requests"
  ON public.aufsteller_requests FOR SELECT
  USING (
    customer_id IN (
      SELECT customer_id FROM public.merchant_assignments WHERE merchant_user_id = auth.uid()
      UNION
      SELECT customer_id FROM public.customer_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Merchants can create aufsteller requests for their customer"
  ON public.aufsteller_requests FOR INSERT
  WITH CHECK (
    customer_id IN (
      SELECT customer_id FROM public.merchant_assignments WHERE merchant_user_id = auth.uid()
      UNION
      SELECT customer_id FROM public.customer_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins manage all aufsteller requests"
  ON public.aufsteller_requests FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_aufsteller_requests_updated_at
  BEFORE UPDATE ON public.aufsteller_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================

CREATE TABLE public.aufsteller_designs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  request_id UUID REFERENCES public.aufsteller_requests(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  uploaded_by_user_id UUID,
  uploaded_by_email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_aufsteller_designs_customer ON public.aufsteller_designs(customer_id);

ALTER TABLE public.aufsteller_designs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can view designs assigned to them"
  ON public.aufsteller_designs FOR SELECT
  USING (
    customer_id IN (
      SELECT customer_id FROM public.merchant_assignments WHERE merchant_user_id = auth.uid()
      UNION
      SELECT customer_id FROM public.customer_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins manage all aufsteller designs"
  ON public.aufsteller_designs FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- Storage bucket
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('aufsteller-designs', 'aufsteller-designs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins can upload aufsteller designs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'aufsteller-designs'
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can update aufsteller designs"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'aufsteller-designs'
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can delete aufsteller designs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'aufsteller-designs'
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can read all aufsteller designs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'aufsteller-designs'
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Merchants can read their aufsteller designs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'aufsteller-designs'
    AND (storage.foldername(name))[1] IN (
      SELECT customer_id::text FROM public.merchant_assignments WHERE merchant_user_id = auth.uid()
      UNION
      SELECT customer_id::text FROM public.customer_users WHERE user_id = auth.uid()
    )
  );
