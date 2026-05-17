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

  IF v_birth IS NULL THEN
    -- Combined welcome + birthdate prompt with CTA to settings
    INSERT INTO public.app_messages (user_id, merchant_customer_id, title, body, system_type, cta_label, cta_route)
    VALUES (
      v_user_id, NULL,
      'Willkommen bei Eloyo! 🎉',
      E'Hallo und schön, dass du dabei bist!\n\nViel Spaß beim Sammeln von Punkten und Freischalten von Prämien bei deinen Lieblingsläden.\n\n🎂 Gib jetzt dein Geburtsdatum an, um an deinem Geburtstag auf all deinen Treuepässen einen Fortschritt geschenkt zu bekommen.',
      'welcome',
      'Geburtsdatum festlegen',
      '/app/settings'
    );
  ELSE
    -- Birth date already set, just welcome
    INSERT INTO public.app_messages (user_id, merchant_customer_id, title, body, system_type)
    VALUES (
      v_user_id, NULL,
      'Willkommen bei Eloyo! 🎉',
      E'Hallo und schön, dass du dabei bist!\n\nViel Spaß beim Sammeln von Punkten und Freischalten von Prämien bei deinen Lieblingsläden. 💜',
      'welcome'
    );
  END IF;

  UPDATE public.profiles
  SET welcome_messages_sent = true
  WHERE user_id = v_user_id;

  RETURN json_build_object('success', true, 'sent', true);
END;
$$;