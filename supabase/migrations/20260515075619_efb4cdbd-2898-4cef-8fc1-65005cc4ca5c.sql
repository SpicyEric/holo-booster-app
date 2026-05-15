
-- 1) Allow system messages without a merchant
ALTER TABLE public.app_messages ALTER COLUMN merchant_customer_id DROP NOT NULL;

-- 2) System-message extras (welcome messages with optional CTA button)
ALTER TABLE public.app_messages
  ADD COLUMN IF NOT EXISTS system_type text,
  ADD COLUMN IF NOT EXISTS cta_label text,
  ADD COLUMN IF NOT EXISTS cta_route text;

-- 3) Track whether welcome messages have been sent for a user
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS welcome_messages_sent boolean NOT NULL DEFAULT false;

-- 4) Lock birth_date once set: trigger blocks changes when value already exists
CREATE OR REPLACE FUNCTION public.prevent_birth_date_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.birth_date IS NOT NULL
     AND NEW.birth_date IS DISTINCT FROM OLD.birth_date THEN
    RAISE EXCEPTION 'birth_date cannot be changed once set';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_lock_birth_date ON public.profiles;
CREATE TRIGGER profiles_lock_birth_date
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_birth_date_change();

-- 5) Skip push for system (no merchant) and inactive merchants in trigger fan-out
--    The existing notify_new_app_message function relies on a service key setting that
--    is typically empty here, so the on-new-app-message edge function is the canonical
--    path. We just leave system messages alone — the edge function will be guarded.

-- 6) RPC: send welcome messages on first login if not already sent
CREATE OR REPLACE FUNCTION public.send_welcome_messages_if_needed()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_already boolean;
  v_birth date;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'unauthorized');
  END IF;

  SELECT welcome_messages_sent, birth_date
    INTO v_already, v_birth
  FROM public.profiles
  WHERE user_id = v_user_id;

  IF v_already IS TRUE THEN
    RETURN json_build_object('success', true, 'sent', false, 'reason', 'already_sent');
  END IF;

  -- Welcome message
  INSERT INTO public.app_messages (user_id, merchant_customer_id, title, body, system_type)
  VALUES (
    v_user_id, NULL,
    'Herzlich willkommen bei Eloyo! 🎉',
    E'Schön, dass du dabei bist!\n\nMit Eloyo sammelst du bei deinen Lieblingsläden ganz einfach Treuepunkte – ohne Karte, ohne Stempelheft. Nur dein Handy.\n\n✨ Sammle Punkte bei jedem Besuch\n🎁 Löse exklusive Prämien ein\n💜 Werde für deine Treue belohnt\n\nViel Spaß beim Entdecken!',
    'welcome'
  );

  -- Birthdate prompt (only if not yet set)
  IF v_birth IS NULL THEN
    INSERT INTO public.app_messages (user_id, merchant_customer_id, title, body, system_type, cta_label, cta_route)
    VALUES (
      v_user_id, NULL,
      'Du willst kostenlos weitere Check-ins? 🎂',
      E'Gib uns jetzt dein Geburtsdatum.\n\nAn deinem Geburtstag bekommst du auf jedem Treuepass, den du zu diesem Zeitpunkt besitzt, einen Check-in geschenkt. 💜\n\nDein Geburtsdatum kannst du nur einmal festlegen – bitte gib es korrekt ein.',
      'birthdate_prompt',
      'Geburtsdatum festlegen',
      '/app/settings'
    );
  END IF;

  UPDATE public.profiles
  SET welcome_messages_sent = true
  WHERE user_id = v_user_id;

  RETURN json_build_object('success', true, 'sent', true);
END;
$$;
