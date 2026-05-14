
-- 1) Bonusfenster auf 90 Tage erhöhen
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
  v_already_has_points boolean;
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

  SELECT EXISTS (
    SELECT 1 FROM loyalty_accounts la
    WHERE la.user_id = v_user_id
      AND la.merchant_customer_id = v_inv.merchant_customer_id
      AND EXISTS (
        SELECT 1 FROM point_transactions pt
        WHERE pt.loyalty_account_id = la.id AND pt.points_change > 0
      )
  ) INTO v_already_has_points;

  IF v_already_has_points THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Du sammelst bereits Punkte bei diesem Geschäft',
      'error_code', 'already_customer'
    );
  END IF;

  SELECT r.* INTO v_existing_for_merchant
  FROM invitation_redemptions r
  JOIN invitations i ON i.id = r.invitation_id
  WHERE r.invitee_user_id = v_user_id
    AND i.merchant_customer_id = v_inv.merchant_customer_id
    AND r.bonus_awarded_at IS NULL
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

CREATE OR REPLACE FUNCTION public.process_referral_bonus(p_user_id uuid, p_merchant_customer_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_red RECORD;
  v_inviter_points integer;
  v_invitee_points integer;
  v_inviter_account RECORD;
  v_invitee_account RECORD;
  v_now timestamptz := now();
  v_same_device boolean := false;
BEGIN
  SELECT r.*, i.inviter_user_id, i.id as inv_id
  INTO v_red
  FROM invitation_redemptions r
  JOIN invitations i ON i.id = r.invitation_id
  WHERE r.invitee_user_id = p_user_id
    AND i.merchant_customer_id = p_merchant_customer_id
    AND r.bonus_awarded_at IS NULL
    AND r.bonus_window_starts_at > (v_now - interval '90 days')
  ORDER BY r.accepted_at DESC
  LIMIT 1
  FOR UPDATE OF r SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN json_build_object('processed', false);
  END IF;

  UPDATE invitation_redemptions SET bonus_awarded_at = v_now WHERE id = v_red.id;

  SELECT EXISTS (
    SELECT 1
    FROM user_device_fingerprints a
    JOIN user_device_fingerprints b ON a.fingerprint = b.fingerprint
    WHERE a.user_id = v_red.inviter_user_id AND b.user_id = p_user_id
  ) INTO v_same_device;

  IF v_same_device THEN
    UPDATE invitations SET status = 'blocked_same_device' WHERE id = v_red.inv_id;
    RETURN json_build_object('processed', true, 'bonus_awarded', false, 'reason', 'same_device');
  END IF;

  SELECT COALESCE(referral_inviter_points, 20) INTO v_inviter_points
  FROM customers WHERE id = p_merchant_customer_id;

  SELECT COALESCE(pt.points_change, 0) INTO v_invitee_points
  FROM point_transactions pt
  JOIN loyalty_accounts la ON la.id = pt.loyalty_account_id
  WHERE la.user_id = p_user_id
    AND la.merchant_customer_id = p_merchant_customer_id
    AND pt.transaction_type = 'nfc_scan'
  ORDER BY pt.created_at DESC
  LIMIT 1;

  v_invitee_points := COALESCE(v_invitee_points, 0);

  SELECT * INTO v_inviter_account FROM loyalty_accounts
  WHERE user_id = v_red.inviter_user_id AND merchant_customer_id = p_merchant_customer_id;

  IF NOT FOUND THEN
    INSERT INTO loyalty_accounts (user_id, merchant_customer_id, current_points_balance)
    VALUES (v_red.inviter_user_id, p_merchant_customer_id, v_inviter_points)
    RETURNING * INTO v_inviter_account;
  ELSE
    UPDATE loyalty_accounts
    SET current_points_balance = current_points_balance + v_inviter_points, updated_at = v_now
    WHERE id = v_inviter_account.id;
  END IF;

  IF v_inviter_points > 0 THEN
    INSERT INTO point_transactions (loyalty_account_id, merchant_customer_id, points_change, transaction_type, description)
    VALUES (v_inviter_account.id, p_merchant_customer_id, v_inviter_points, 'referral_bonus', 'Empfehlungs-Bonus (Einladender)');
  END IF;

  SELECT * INTO v_invitee_account FROM loyalty_accounts
  WHERE user_id = p_user_id AND merchant_customer_id = p_merchant_customer_id;

  IF NOT FOUND THEN
    INSERT INTO loyalty_accounts (user_id, merchant_customer_id, current_points_balance)
    VALUES (p_user_id, p_merchant_customer_id, v_invitee_points)
    RETURNING * INTO v_invitee_account;
  ELSE
    UPDATE loyalty_accounts
    SET current_points_balance = current_points_balance + v_invitee_points, updated_at = v_now
    WHERE id = v_invitee_account.id;
  END IF;

  IF v_invitee_points > 0 THEN
    INSERT INTO point_transactions (loyalty_account_id, merchant_customer_id, points_change, transaction_type, description)
    VALUES (v_invitee_account.id, p_merchant_customer_id, v_invitee_points, 'referral_bonus', 'Willkommens-Bonus: Doppelte Punkte für deinen ersten Stempel');
  END IF;

  UPDATE invitation_redemptions SET invitee_stamped_at = v_now, inviter_stamped_at = v_now WHERE id = v_red.id;
  UPDATE invitations SET status = 'converted' WHERE id = v_red.inv_id;

  RETURN json_build_object(
    'processed', true, 'bonus_awarded', true,
    'inviter_points', v_inviter_points, 'invitee_points', v_invitee_points,
    'inviter_user_id', v_red.inviter_user_id, 'invitee_user_id', p_user_id,
    'merchant_customer_id', p_merchant_customer_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_pending_invitation()
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_red RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false);
  END IF;

  SELECT 
    r.id as redemption_id, r.bonus_window_starts_at, r.bonus_awarded_at,
    i.id as invitation_id, i.merchant_customer_id,
    c.name, c.company_name, c.logo_url, c.cover_image_url, c.referral_invitee_points
  INTO v_red
  FROM invitation_redemptions r
  JOIN invitations i ON i.id = r.invitation_id
  JOIN customers c ON c.id = i.merchant_customer_id
  WHERE r.invitee_user_id = v_user_id
    AND r.bonus_awarded_at IS NULL
    AND r.bonus_window_starts_at > (now() - interval '90 days')
  ORDER BY r.accepted_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false);
  END IF;

  RETURN json_build_object(
    'success', true,
    'redemption_id', v_red.redemption_id,
    'merchant_customer_id', v_red.merchant_customer_id,
    'merchant_name', COALESCE(v_red.company_name, v_red.name),
    'logo_url', v_red.logo_url,
    'cover_image_url', v_red.cover_image_url,
    'invitee_points', v_red.referral_invitee_points,
    'window_ends_at', v_red.bonus_window_starts_at + interval '90 days'
  );
END;
$function$;

-- 2) Cancel-Funktion für offene Einladungen (durch den Eingeladenen)
CREATE OR REPLACE FUNCTION public.cancel_invitation_redemption(p_redemption_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_red RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Nicht authentifiziert');
  END IF;

  SELECT * INTO v_red FROM invitation_redemptions
  WHERE id = p_redemption_id AND invitee_user_id = v_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Einladung nicht gefunden');
  END IF;

  IF v_red.bonus_awarded_at IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'Bonus wurde bereits ausgezahlt');
  END IF;

  DELETE FROM invitation_redemptions WHERE id = p_redemption_id;

  RETURN json_build_object('success', true);
END;
$$;

-- 3) Google-Review-Bonus: ein Check-in pro User+Merchant (idempotent)
CREATE OR REPLACE FUNCTION public.award_google_review_bonus(p_merchant_customer_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_loyalty_account RECORD;
  v_existing RECORD;
  v_new_balance integer;
  v_merchant_active boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Nicht authentifiziert');
  END IF;

  SELECT active INTO v_merchant_active FROM customers WHERE id = p_merchant_customer_id;
  IF NOT FOUND OR v_merchant_active IS NOT TRUE THEN
    RETURN json_build_object('success', false, 'error', 'Geschäft nicht verfügbar');
  END IF;

  SELECT * INTO v_loyalty_account
  FROM loyalty_accounts
  WHERE user_id = v_user_id AND merchant_customer_id = p_merchant_customer_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Du musst zuerst mindestens einmal in diesem Geschäft eingecheckt haben.',
      'error_code', 'no_loyalty_account'
    );
  END IF;

  -- Bereits beansprucht?
  SELECT * INTO v_existing FROM point_transactions
  WHERE loyalty_account_id = v_loyalty_account.id
    AND transaction_type = 'google_review_bonus'
  LIMIT 1;

  IF FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Bonus für diese Bewertung wurde bereits eingelöst',
      'error_code', 'already_redeemed'
    );
  END IF;

  UPDATE loyalty_accounts
  SET current_points_balance = current_points_balance + 1, updated_at = now()
  WHERE id = v_loyalty_account.id
  RETURNING current_points_balance INTO v_new_balance;

  INSERT INTO point_transactions (loyalty_account_id, merchant_customer_id, points_change, transaction_type, description)
  VALUES (v_loyalty_account.id, p_merchant_customer_id, 1, 'google_review_bonus', 'Bonus für Google-Bewertung');

  RETURN json_build_object(
    'success', true,
    'points_awarded', 1,
    'total_points', v_new_balance
  );
END;
$$;
