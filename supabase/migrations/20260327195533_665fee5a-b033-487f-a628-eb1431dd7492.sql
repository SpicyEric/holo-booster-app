
CREATE TABLE public.discovered_stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  place_id TEXT,
  name TEXT NOT NULL,
  address TEXT,
  street TEXT,
  house_number TEXT,
  postal_code TEXT,
  city TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  phone TEXT,
  email TEXT,
  website TEXT,
  google_rating NUMERIC(2,1),
  google_reviews_count INTEGER,
  google_photo_url TEXT,
  industry TEXT,
  contact_person TEXT,
  opening_hours JSONB,
  ai_summary TEXT,
  enrichment_status TEXT NOT NULL DEFAULT 'pending',
  enrichment_data JSONB,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.discovered_stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage discovered stores"
ON public.discovered_stores
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_discovered_stores_updated_at
  BEFORE UPDATE ON public.discovered_stores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
