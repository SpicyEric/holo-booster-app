
CREATE TABLE IF NOT EXISTS public.sms_otp_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sms_otp_attempts_phone_time ON public.sms_otp_attempts (phone, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_otp_attempts_ip_time ON public.sms_otp_attempts (ip_address, created_at DESC);

ALTER TABLE public.sms_otp_attempts ENABLE ROW LEVEL SECURITY;

-- Keine Policies: nur Service-Role hat Zugriff (Edge Function)
