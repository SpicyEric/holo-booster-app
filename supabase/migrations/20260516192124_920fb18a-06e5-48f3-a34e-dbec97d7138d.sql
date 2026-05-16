CREATE TABLE IF NOT EXISTS public.phone_otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS phone_otp_codes_phone_idx ON public.phone_otp_codes(phone, created_at DESC);
CREATE INDEX IF NOT EXISTS phone_otp_codes_expires_idx ON public.phone_otp_codes(expires_at);

ALTER TABLE public.phone_otp_codes ENABLE ROW LEVEL SECURITY;
-- Bewusst KEINE Policies: nur Service-Role (Edge Functions) darf zugreifen.