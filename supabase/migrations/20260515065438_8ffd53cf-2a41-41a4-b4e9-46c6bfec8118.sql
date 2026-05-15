
ALTER TABLE public.invitations
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '90 days');

CREATE OR REPLACE FUNCTION public.create_invitation(p_merchant_customer_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_code text;
  v_attempts int := 0;
  v_invitation_id uuid;
  v_expires_at timestamptz := now() + interval '90 days';
  v_merchant_active boolean;
  v_referral_enabled boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Nicht authentifiziert');
  END IF;

  SELECT active, referral_enabled INTO v_merchant_active, v_referral_enabled
  FROM customers WHERE id = p_merchant_customer_id;

  IF NOT FOUND OR v_merchant_active IS NOT TRUE THEN
    RETURN json_build_object('success', false, 'error', 'Geschäft nicht verfügbar');
  END IF;

  IF v_referral_enabled IS NOT TRUE THEN
    RETURN json_build_object('success', false, 'error', 'Empfehlungen sind für dieses Geschäft deaktiviert');
  END IF;

  LOOP
    v_attempts := v_attempts + 1;
    v_code := substring(
      translate(upper(replace(gen_random_uuid()::text, '-', '')), '0O1IL', 'ZYXWV'),
      1, 8
    );
    BEGIN
      INSERT INTO invitations (share_code, inviter_user_id, merchant_customer_id, expires_at)
      VALUES (v_code, v_user_id, p_merchant_customer_id, v_expires_at)
      RETURNING id INTO v_invitation_id;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF v_attempts > 5 THEN
        RETURN json_build_object('success', false, 'error', 'Code-Generierung fehlgeschlagen');
      END IF;
    END;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'invitation_id', v_invitation_id,
    'share_code', v_code,
    'expires_at', v_expires_at
  );
END;
$function$;
