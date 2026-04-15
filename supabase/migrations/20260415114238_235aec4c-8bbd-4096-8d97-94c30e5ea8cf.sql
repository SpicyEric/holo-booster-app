
-- 1. profiles erweitern
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- 2. box_pakete Tabelle
CREATE TABLE public.box_pakete (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vertriebler_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paket_typ TEXT NOT NULL CHECK (paket_typ IN ('starter', 'vertrieb')),
  anzahl_boxen INT NOT NULL,
  bestelldatum TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'offen' CHECK (status IN ('offen', 'versendet', 'abgeschlossen')),
  notizen TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.box_pakete ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all box_pakete"
  ON public.box_pakete FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Partners can view their own box_pakete"
  ON public.box_pakete FOR SELECT
  TO authenticated
  USING (vertriebler_id = auth.uid());

CREATE POLICY "Partners can insert their own box_pakete"
  ON public.box_pakete FOR INSERT
  TO authenticated
  WITH CHECK (vertriebler_id = auth.uid());

CREATE TRIGGER update_box_pakete_updated_at
  BEFORE UPDATE ON public.box_pakete
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 3. eloyo_boxes Tabelle
CREATE TABLE public.eloyo_boxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  box_id TEXT UNIQUE NOT NULL,
  stempel_id TEXT REFERENCES public.boxes(stamp_id),
  paket_id UUID REFERENCES public.box_pakete(id),
  vertriebler_id UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'verfuegbar' CHECK (status IN ('verfuegbar','versendet','abgeschlossen','retourniert','in_rechnung_gestellt')),
  preis_protokolliert NUMERIC NOT NULL DEFAULT 30,
  bestelldatum TIMESTAMPTZ,
  versanddatum TIMESTAMPTZ,
  frist_ablauf TIMESTAMPTZ,
  haendler_id UUID REFERENCES public.customers(id),
  abschlussdatum TIMESTAMPTZ,
  retour_datum TIMESTAMPTZ,
  rechnung_stripe_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.eloyo_boxes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all eloyo_boxes"
  ON public.eloyo_boxes FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Partners can view their own eloyo_boxes"
  ON public.eloyo_boxes FOR SELECT
  TO authenticated
  USING (vertriebler_id = auth.uid());

CREATE INDEX idx_eloyo_boxes_vertriebler ON public.eloyo_boxes(vertriebler_id);
CREATE INDEX idx_eloyo_boxes_paket ON public.eloyo_boxes(paket_id);
CREATE INDEX idx_eloyo_boxes_status ON public.eloyo_boxes(status);
CREATE INDEX idx_eloyo_boxes_stempel ON public.eloyo_boxes(stempel_id);
CREATE INDEX idx_eloyo_boxes_frist ON public.eloyo_boxes(frist_ablauf) WHERE status = 'versendet';

CREATE TRIGGER update_eloyo_boxes_updated_at
  BEFORE UPDATE ON public.eloyo_boxes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
