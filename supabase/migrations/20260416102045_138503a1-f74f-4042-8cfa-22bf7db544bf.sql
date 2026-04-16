-- Add activated_at to sales_rep_profiles
ALTER TABLE public.sales_rep_profiles
ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create contract uploads table (append-only history)
CREATE TABLE IF NOT EXISTS public.sales_rep_contract_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vertriebler_id UUID NOT NULL REFERENCES public.sales_rep_profiles(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  confirmed_by_user_id UUID DEFAULT NULL
);

ALTER TABLE public.sales_rep_contract_uploads ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage all contract uploads"
ON public.sales_rep_contract_uploads
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Sales partners can view their own uploads
CREATE POLICY "Partners can view their own contract uploads"
ON public.sales_rep_contract_uploads
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sales_rep_profiles srp
    WHERE srp.id = sales_rep_contract_uploads.vertriebler_id
      AND srp.user_id = auth.uid()
  )
);

-- Sales partners can insert their own uploads
CREATE POLICY "Partners can insert their own contract uploads"
ON public.sales_rep_contract_uploads
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sales_rep_profiles srp
    WHERE srp.id = sales_rep_contract_uploads.vertriebler_id
      AND srp.user_id = auth.uid()
  )
);