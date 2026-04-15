
-- Create vertriebler_gutschriften table
CREATE TABLE public.vertriebler_gutschriften (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vertriebler_id UUID NOT NULL REFERENCES public.sales_rep_profiles(id) ON DELETE CASCADE,
  gutschrift_nummer TEXT UNIQUE NOT NULL,
  periode TEXT NOT NULL,
  periode_monat INT NOT NULL,
  periode_jahr INT NOT NULL,
  erstelldatum TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  aktive_kunden_snapshot INT NOT NULL DEFAULT 0,
  folgeprovision_netto NUMERIC NOT NULL DEFAULT 0,
  
  direktprovision_netto NUMERIC NOT NULL DEFAULT 0,
  direktprovision_details JSONB DEFAULT '[]'::jsonb,
  
  sponsor_bonus_netto NUMERIC NOT NULL DEFAULT 0,
  sponsor_bonus_details JSONB DEFAULT '[]'::jsonb,
  
  gesamt_netto NUMERIC NOT NULL DEFAULT 0,
  ust_pflichtig BOOLEAN NOT NULL DEFAULT false,
  ust_id TEXT,
  ust_betrag NUMERIC NOT NULL DEFAULT 0,
  gesamt_brutto NUMERIC NOT NULL DEFAULT 0,
  
  status TEXT NOT NULL DEFAULT 'erstellt',
  ausgezahlt_am TIMESTAMPTZ,
  pdf_url TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(vertriebler_id, periode_monat, periode_jahr)
);

-- RLS
ALTER TABLE public.vertriebler_gutschriften ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all gutschriften"
ON public.vertriebler_gutschriften FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Sales reps can view own gutschriften"
ON public.vertriebler_gutschriften FOR SELECT TO authenticated
USING (vertriebler_id IN (
  SELECT id FROM public.sales_rep_profiles WHERE user_id = auth.uid()
));

-- Indexes
CREATE INDEX idx_gutschriften_vertriebler ON public.vertriebler_gutschriften(vertriebler_id);
CREATE INDEX idx_gutschriften_periode ON public.vertriebler_gutschriften(periode_jahr, periode_monat);
CREATE INDEX idx_gutschriften_status ON public.vertriebler_gutschriften(status);

-- Storage bucket for PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('gutschriften', 'gutschriften', false);

-- Storage policies
CREATE POLICY "Admins can manage gutschrift files"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'gutschriften' AND public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (bucket_id = 'gutschriften' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Sales reps can view own gutschrift files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'gutschriften' 
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.sales_rep_profiles WHERE user_id = auth.uid()
  )
);
