-- Add digital contract acceptance fields to sales_rep_profiles
ALTER TABLE public.sales_rep_profiles
ADD COLUMN IF NOT EXISTS vertrag_angenommen_am TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS vertrag_ip TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS vertrag_user_agent TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS vertrag_pdf_url TEXT DEFAULT NULL;

-- Create private storage bucket for contracts
INSERT INTO storage.buckets (id, name, public)
VALUES ('vertraege', 'vertraege', false)
ON CONFLICT (id) DO NOTHING;

-- Admins can manage all files in vertraege bucket
CREATE POLICY "Admins can manage vertraege files"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'vertraege' AND public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (bucket_id = 'vertraege' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- Partners can read their own contract PDFs
CREATE POLICY "Partners can read own vertraege"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'vertraege' AND
  (storage.foldername(name))[1] = auth.uid()::text
);