
CREATE OR REPLACE FUNCTION public.process_referral_bonus(p_user_id uuid, p_merchant_customer_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_red RECORD;
  v_inviter_account RECORD;
  v_invitee_account RECORD;
  v_now timestamptz := now();
  v_today date := (now() AT TIME ZONE 'Europe/Berlin')::date;
  v_same_device boolean := false;
  v_had_prior_checkin boolean := false;
  v_referral_index integer;
  v_boosts_due integer;
  v_state RECORD;
  v_boosts_today integer := 0;
  v_boosts_to_grant integer;
  v_boosts_pending integer;
  v_new_inviter_balance integer;
  v_new_invitee_balance integer;
  i integer;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RETURN json_build_object('processed', false, 'error', 'Nicht authentifiziert');
  END IF;

  SELECT r.*, i.inviter_user_id, i.id AS inv_id
  INTO v_red
  FROM invitation_redemptions r
  JOIN invitations i ON i.id = r.invitation_id
  WHERE r.invitee_user_id = p_user_id
    AND i.merchant_customer_id = p_merchant_customer_id
    AND r.bonus_awarded_at IS NULL
    AND r.invitee_stamped_at IS NULL
    AND r.bonus_window_starts_at > (v_now - interval '90 days')
  ORDER BY r.accepted_at DESC
  LIMIT 1
  FOR UPDATE OF r SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN json_build_object('processed', false);
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM loyalty_accounts la
    JOIN point_transactions pt
      ON pt.loyalty_account_id = la.id
     AND pt.merchant_customer_id = la.merchant_customer_id
    WHERE la.user_id = p_user_id
      AND la.merchant_customer_id = p_merchant_customer_id
      AND pt.transaction_type IN ('nfc_stamp', 'check_in', 'nfc_scan')
      AND pt.created_at <= COALESCE(v_red.accepted_at, v_red.bonus_window_starts_at, v_now)
  ) INTO v_had_prior_checkin;

  IF v_had_prior_checkin THEN
    UPDATE invitation_redemptions SET invitee_stamped_at = v_now WHERE id = v_red.id;
    UPDATE invitations SET status = 'blocked_already_customer' WHERE id = v_red.inv_id;
    RETURN json_build_object(
      'processed', true,
      'bonus_awarded', false,
      'reason', 'already_checked_in',
      'merchant_customer_id', p_merchant_customer_id
    );
  END IF;

  UPDATE invitation_redemptions
  SET bonus_awarded_at = v_now,
      invitee_stamped_at = v_now
  WHERE id = v_red.id;

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

  -- Inviter Account + referral counter
  SELECT * INTO v_inviter_account
  FROM loyalty_accounts
  WHERE user_id = v_red.inviter_user_id AND merchant_customer_id = p_merchant_customer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO loyalty_accounts (user_id, merchant_customer_id, current_points_balance, successful_referrals)
    VALUES (v_red.inviter_user_id, p_merchant_customer_id, 0, 1)
    RETURNING * INTO v_inviter_account;
    v_referral_index := 1;
  ELSE
    UPDATE loyalty_accounts
    SET successful_referrals = COALESCE(successful_referrals, 0) + 1,
        updated_at = v_now
    WHERE id = v_inviter_account.id
    RETURNING successful_referrals INTO v_referral_index;
  END IF;

  v_boosts_due := public.calc_boost_reward(v_referral_index);

  SELECT * INTO v_state FROM boost_processing_state
  WHERE user_id = v_red.inviter_user_id FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO boost_processing_state (user_id, boosts_today, last_processed_date)
    VALUES (v_red.inviter_user_id, 0, v_today)
    RETURNING * INTO v_state;
  END IF;

  IF v_state.last_processed_date < v_today THEN
    UPDATE boost_processing_state
    SET boosts_today = 0, last_processed_date = v_today, updated_at = v_now
    WHERE user_id = v_red.inviter_user_id;
    v_boosts_today := 0;
  ELSE
    v_boosts_today := v_state.boosts_today;
  END IF;

  v_boosts_to_grant := GREATEST(0, LEAST(v_boosts_due, 5 - v_boosts_today));
  v_boosts_pending := v_boosts_due - v_boosts_to_grant;

  -- Inviter: pro Boost ein sichtbarer Bonus-Check-in (transaction_type='check_in')
  IF v_boosts_to_grant > 0 THEN
    UPDATE loyalty_accounts
    SET current_points_balance = current_points_balance + v_boosts_to_grant,
        updated_at = v_now
    WHERE id = v_inviter_account.id
    RETURNING current_points_balance INTO v_new_inviter_balance;

    FOR i IN 1..v_boosts_to_grant LOOP
      INSERT INTO point_transactions (loyalty_account_id, merchant_customer_id, points_change, transaction_type, description)
      VALUES (
        v_inviter_account.id,
        p_merchant_customer_id,
        1,
        'check_in',
        'Bonus-Check-in: Empfehlung'
      );
    END LOOP;

    UPDATE boost_processing_state
    SET boosts_today = boosts_today + v_boosts_to_grant,
        updated_at = v_now
    WHERE user_id = v_red.inviter_user_id;
  END IF;

  IF v_boosts_pending > 0 THEN
    INSERT INTO pending_boosts (user_id, merchant_customer_id, boost_count, referral_index, invitee_user_id)
    VALUES (v_red.inviter_user_id, p_merchant_customer_id, v_boosts_pending, v_referral_index, p_user_id);
  END IF;

  -- Invitee: zusätzlicher Bonus-Check-in zum gerade erfassten ersten Check-in
  SELECT * INTO v_invitee_account
  FROM loyalty_accounts
  WHERE user_id = p_user_id AND merchant_customer_id = p_merchant_customer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO loyalty_accounts (user_id, merchant_customer_id, current_points_balance)
    VALUES (p_user_id, p_merchant_customer_id, 1)
    RETURNING * INTO v_invitee_account;
    v_new_invitee_balance := 1;
  ELSE
    UPDATE loyalty_accounts
    SET current_points_balance = current_points_balance + 1,
        updated_at = v_now
    WHERE id = v_invitee_account.id
    RETURNING current_points_balance INTO v_new_invitee_balance;
  END IF;

  INSERT INTO point_transactions (loyalty_account_id, merchant_customer_id, points_change, transaction_type, description)
  VALUES (
    v_invitee_account.id,
    p_merchant_customer_id,
    1,
    'check_in',
    'Bonus-Check-in: Willkommen durch Empfehlung'
  );

  UPDATE invitations SET status = 'converted' WHERE id = v_red.inv_id;

  RETURN json_build_object(
    'processed', true,
    'bonus_awarded', true,
    'inviter_user_id', v_red.inviter_user_id,
    'invitee_user_id', p_user_id,
    'merchant_customer_id', p_merchant_customer_id,
    'referral_index', v_referral_index,
    'boosts_due', v_boosts_due,
    'boosts_granted', v_boosts_to_grant,
    'boosts_pending', v_boosts_pending,
    'inviter_points', v_boosts_to_grant,
    'invitee_points', 1,
    'invitee_total_points', v_new_invitee_balance
  );
END;
$function$;
