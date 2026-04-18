
-- ============================================================
-- 1. sales_rep_profiles erweitern
-- ============================================================
ALTER TABLE public.sales_rep_profiles
  ADD COLUMN IF NOT EXISTS vertrag_version TEXT,
  ADD COLUMN IF NOT EXISTS vertrag_outdated_seit TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS vertrag_inaktiv BOOLEAN DEFAULT false;

-- ============================================================
-- 2. Tabelle vertrag_versionen
-- ============================================================
CREATE TABLE IF NOT EXISTS public.vertrag_versionen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT UNIQUE NOT NULL,
  titel TEXT NOT NULL,
  pdf_url TEXT NOT NULL,
  ist_aktiv BOOLEAN NOT NULL DEFAULT false,
  notizen TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Garantiere höchstens eine aktive Version
CREATE UNIQUE INDEX IF NOT EXISTS vertrag_versionen_one_active
  ON public.vertrag_versionen (ist_aktiv) WHERE ist_aktiv = true;

ALTER TABLE public.vertrag_versionen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage vertrag_versionen"
  ON public.vertrag_versionen
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Partners read vertrag_versionen"
  ON public.vertrag_versionen
  FOR SELECT
  USING (public.has_role(auth.uid(), 'partner'));

-- ============================================================
-- 3. Tabelle zusatzvereinbarungen
-- ============================================================
CREATE TABLE IF NOT EXISTS public.zusatzvereinbarungen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titel TEXT NOT NULL,
  beschreibung TEXT,
  pdf_url TEXT NOT NULL,
  ist_aktiv BOOLEAN NOT NULL DEFAULT false,
  pflicht BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.zusatzvereinbarungen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage zusatzvereinbarungen"
  ON public.zusatzvereinbarungen
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Partners read active zusatzvereinbarungen"
  ON public.zusatzvereinbarungen
  FOR SELECT
  USING (public.has_role(auth.uid(), 'partner') AND ist_aktiv = true);

-- ============================================================
-- 4. Tabelle vertriebler_zusatzvereinbarungen
-- ============================================================
CREATE TABLE IF NOT EXISTS public.vertriebler_zusatzvereinbarungen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vereinbarung_id UUID NOT NULL REFERENCES public.zusatzvereinbarungen(id) ON DELETE CASCADE,
  angenommen_am TIMESTAMPTZ,
  ip TEXT,
  user_agent TEXT,
  pdf_url TEXT,
  status TEXT NOT NULL DEFAULT 'ausstehend' CHECK (status IN ('ausstehend','angenommen')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, vereinbarung_id)
);

ALTER TABLE public.vertriebler_zusatzvereinbarungen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read all vertriebler_zusatzvereinbarungen"
  ON public.vertriebler_zusatzvereinbarungen
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Partners read own vertriebler_zusatzvereinbarungen"
  ON public.vertriebler_zusatzvereinbarungen
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role writes vertriebler_zusatzvereinbarungen"
  ON public.vertriebler_zusatzvereinbarungen
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- 5. Trigger: bei Aktivierung neuer Version → Vertriebler outdaten
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_vertrag_version_activation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.ist_aktiv = true AND (OLD IS NULL OR OLD.ist_aktiv = false) THEN
    -- Alle anderen Versionen deaktivieren
    UPDATE public.vertrag_versionen
       SET ist_aktiv = false
     WHERE id <> NEW.id AND ist_aktiv = true;

    -- Alle bereits unterzeichneten Vertriebler mit anderer Version → outdated
    UPDATE public.sales_rep_profiles
       SET vertrag_outdated = true,
           vertrag_outdated_seit = COALESCE(vertrag_outdated_seit, now()),
           updated_at = now()
     WHERE contract_status = 'angenommen'
       AND (vertrag_version IS DISTINCT FROM NEW.version);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vertrag_version_activation ON public.vertrag_versionen;
CREATE TRIGGER trg_vertrag_version_activation
  AFTER INSERT OR UPDATE OF ist_aktiv ON public.vertrag_versionen
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_vertrag_version_activation();

-- ============================================================
-- 6. Storage Bucket vertraege-vorlagen (privat)
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('vertraege-vorlagen', 'vertraege-vorlagen', false)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies: Admins lesen + schreiben, Partner lesen
CREATE POLICY "Admins manage vertraege-vorlagen"
  ON storage.objects
  FOR ALL
  USING (bucket_id = 'vertraege-vorlagen' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'vertraege-vorlagen' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Partners read vertraege-vorlagen"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'vertraege-vorlagen' AND public.has_role(auth.uid(), 'partner'));
