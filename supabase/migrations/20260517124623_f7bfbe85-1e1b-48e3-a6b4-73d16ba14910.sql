CREATE OR REPLACE FUNCTION public.user_has_merchant_checkin(p_user_id uuid, p_merchant_customer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.loyalty_accounts la
    JOIN public.point_transactions pt
      ON pt.loyalty_account_id = la.id
     AND pt.merchant_customer_id = la.merchant_customer_id
    WHERE la.user_id = p_user_id
      AND la.merchant_customer_id = p_merchant_customer_id
      AND pt.transaction_type IN ('nfc_stamp', 'check_in', 'nfc_scan')
  );
$$;

CREATE OR REPLACE FUNCTION public.consume_invitation(p_share_code text, p_device_fingerprint text DEFAULT NULL::text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_inv RECORD;
  v_existing_for_merchant RECORD;
  v_already_checked_in boolean;
  v_device_already_redeemed boolean := false;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Nicht authentifiziert');
  END IF;

  SELECT * INTO v_inv FROM invitations WHERE share_code = p_share_code;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Einladung nicht gefunden');
  END IF;

  IF v_inv.expires_at < now() THEN
    RETURN json_build_object('success', false, 'error', 'Einladung abgelaufen');
  END IF;

  IF v_inv.inviter_user_id = v_user_id THEN
    RETURN json_build_object('success', false, 'error', 'Du kannst dich nicht selbst einladen');
  END IF;

  SELECT public.user_has_merchant_checkin(v_user_id, v_inv.merchant_customer_id)
  INTO v_already_checked_in;

  IF v_already_checked_in THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Du hast bei diesem Geschäft bereits eingecheckt. Einladungen gelten nur vor dem ersten Check-in.',
      'error_code', 'already_checked_in'
    );
  END IF;

  SELECT r.* INTO v_existing_for_merchant
  FROM invitation_redemptions r
  JOIN invitations i ON i.id = r.invitation_id
  WHERE r.invitee_user_id = v_user_id
    AND i.merchant_customer_id = v_inv.merchant_customer_id
    AND r.bonus_awarded_at IS NULL
    AND r.invitee_stamped_at IS NULL
    AND r.bonus_window_starts_at > (now() - interval '90 days')
  LIMIT 1;

  IF FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Du hast bereits eine offene Einladung für dieses Geschäft',
      'error_code', 'already_pending'
    );
  END IF;

  IF p_device_fingerprint IS NOT NULL AND trim(p_device_fingerprint) <> '' THEN
    INSERT INTO user_device_fingerprints (user_id, fingerprint, last_seen_at)
    VALUES (v_user_id, p_device_fingerprint, now())
    ON CONFLICT (user_id, fingerprint) DO UPDATE SET last_seen_at = now();

    SELECT EXISTS (
      SELECT 1
      FROM user_device_fingerprints fp
      JOIN invitation_redemptions r ON r.invitee_user_id = fp.user_id
      JOIN invitations i ON i.id = r.invitation_id
      WHERE fp.fingerprint = p_device_fingerprint
        AND i.merchant_customer_id = v_inv.merchant_customer_id
        AND r.bonus_awarded_at IS NOT NULL
    ) INTO v_device_already_redeemed;

    IF v_device_already_redeemed THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Auf diesem Gerät wurde bereits eine Einladung für dieses Geschäft eingelöst.',
        'error_code', 'device_already_redeemed_for_merchant'
      );
    END IF;
  END IF;

  INSERT INTO invitation_redemptions (invitation_id, invitee_user_id, bonus_window_starts_at)
  VALUES (v_inv.id, v_user_id, now());

  UPDATE invitations SET status = 'accepted' WHERE id = v_inv.id AND status = 'pending';

  RETURN json_build_object(
    'success', true,
    'invitation_id', v_inv.id,
    'merchant_customer_id', v_inv.merchant_customer_id,
    'window_ends_at', now() + interval '90 days'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.consume_invitation(p_share_code text)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.consume_invitation(p_share_code, NULL::text);
$$;