-- Erweitere customers Tabelle für individualisierbare Texte und QR-Code
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS offer_title TEXT DEFAULT 'Nur noch ein Schritt zu deinem Geschenk',
ADD COLUMN IF NOT EXISTS offer_details TEXT,
ADD COLUMN IF NOT EXISTS qr_code_url TEXT;