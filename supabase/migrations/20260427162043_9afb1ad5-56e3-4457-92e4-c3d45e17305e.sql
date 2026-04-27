-- Add winback automation columns to customers
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS winback_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS winback_message text,
  ADD COLUMN IF NOT EXISTS winback_inactivity_days integer NOT NULL DEFAULT 90,
  ADD COLUMN IF NOT EXISTS winback_gift_type text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS winback_bonus_points integer,
  ADD COLUMN IF NOT EXISTS winback_offer_title text,
  ADD COLUMN IF NOT EXISTS winback_offer_description text;

-- Validation trigger for sane inactivity range (instead of CHECK constraint)
CREATE OR REPLACE FUNCTION public.validate_winback_settings()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.winback_inactivity_days IS NULL OR NEW.winback_inactivity_days < 7 THEN
    NEW.winback_inactivity_days := 7;
  END IF;
  IF NEW.winback_inactivity_days > 365 THEN
    NEW.winback_inactivity_days := 365;
  END IF;
  IF NEW.winback_gift_type NOT IN ('none','points','offer') THEN
    NEW.winback_gift_type := 'none';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_winback_settings ON public.customers;
CREATE TRIGGER trg_validate_winback_settings
BEFORE INSERT OR UPDATE OF winback_enabled, winback_inactivity_days, winback_gift_type
ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.validate_winback_settings();

-- Track winback messages to prevent duplicate sends per inactivity cycle
CREATE TABLE IF NOT EXISTS public.winback_message_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  app_message_id uuid,
  last_stamp_at timestamptz,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (merchant_customer_id, user_id, last_stamp_at)
);

CREATE INDEX IF NOT EXISTS idx_winback_log_merchant_user
  ON public.winback_message_log (merchant_customer_id, user_id);

ALTER TABLE public.winback_message_log ENABLE ROW LEVEL SECURITY;

-- Only admins can see the log directly; merchants/users see their messages via app_messages
CREATE POLICY "Admins can view winback logs"
ON public.winback_message_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));