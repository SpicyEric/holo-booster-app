-- Update process_referral_bonus: Invitee bekommt als Bonus exakt die Punkte
-- seines GERADE gebuchten ersten Stempels noch einmal obendrauf (= doppelte Punkte).
-- Inviter-Bonus bleibt unverändert (vom Händler in customers.referral_inviter_points festgelegt).
CREATE OR REPLACE FUNCTION public.process_referral_bonus(p_user_id uuid, p_merchant_customer_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_red RECORD;
  v_inviter_points integer;
  v_invitee_points integer;  -- = Punkte des ersten Stempels (= Verdopplungs-Bonus)
  v_inviter_account RECORD;
  v_invitee_account RECORD;
  v_now timestamptz := now();
  v_same_device boolean := false;
  v_last_stamp_points integer;
BEGIN
  -- Suche offene Einladung dieses Users (als Invitee) für diesen Laden
  SELECT r.*, i.inviter_user_id, i.id as inv_id
  INTO v_red
  FROM invitation_redemptions r
  JOIN invitations i ON i.id = r.invitation_id
  WHERE r.invitee_user_id = p_user_id
    AND i.merchant_customer_id = p_merchant_customer_id
    AND r.bonus_awarded_at IS NULL
    AND r.bonus_window_starts_at > (v_now - interval '7 days')
  ORDER BY r.accepted_at DESC
  LIMIT 1
  FOR UPDATE OF r SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN json_build_object('processed', false);
  END IF;

  -- Sofort als "in Bearbeitung" markieren
  UPDATE invitation_redemptions
  SET bonus_awarded_at = v_now
  WHERE id = v_red.id;

  -- Geräte-Check
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

  -- Inviter-Punkte (vom Händler festgelegt)
  SELECT referral_inviter_points
  INTO v_inviter_points
  FROM customers WHERE id = p_merchant_customer_id;

  -- Ermittle den Punktwert des letzten Stempels des Invitees bei diesem Händler.
  -- Das ist der Stempel, der gerade ausgelöst hat, dass diese Funktion aufgerufen wird.
  -- Akzeptierte Typen: alles, was kein referral_bonus selbst ist und positive Punkte hat.
  SELECT pt.points_change
  INTO v_last_stamp_points
  FROM point_transactions pt
  JOIN loyalty_accounts la ON la.id = pt.loyalty_account_id
  WHERE la.user_id = p_user_id
    AND pt.merchant_customer_id = p_merchant_customer_id
    AND pt.points_change > 0
    AND pt.transaction_type <> 'referral_bonus'
  ORDER BY pt.created_at DESC
  LIMIT 1;

  -- Verdopplungs-Bonus = derselbe Betrag noch einmal
  v_invitee_points := COALESCE(v_last_stamp_points, 0);

  -- Inviter Bonus
  SELECT * INTO v_inviter_account FROM loyalty_accounts
  WHERE user_id = v_red.inviter_user_id AND merchant_customer_id = p_merchant_customer_id;

  IF NOT FOUND THEN
    INSERT INTO loyalty_accounts (user_id, merchant_customer_id, current_points_balance)
    VALUES (v_red.inviter_user_id, p_merchant_customer_id, COALESCE(v_inviter_points, 0))
    RETURNING * INTO v_inviter_account;
  ELSE
    UPDATE loyalty_accounts
    SET current_points_balance = current_points_balance + COALESCE(v_inviter_points, 0), updated_at = v_now
    WHERE id = v_inviter_account.id;
  END IF;

  IF COALESCE(v_inviter_points, 0) > 0 THEN
    INSERT INTO point_transactions (loyalty_account_id, merchant_customer_id, points_change, transaction_type, description)
    VALUES (v_inviter_account.id, p_merchant_customer_id, v_inviter_points, 'referral_bonus', 'Empfehlungs-Bonus (Einladender)');
  END IF;

  -- Invitee Bonus = Verdopplung des ersten Stempels
  SELECT * INTO v_invitee_account FROM loyalty_accounts
  WHERE user_id = p_user_id AND merchant_customer_id = p_merchant_customer_id;

  IF NOT FOUND THEN
    INSERT INTO loyalty_accounts (user_id, merchant_customer_id, current_points_balance)
    VALUES (p_user_id, p_merchant_customer_id, COALESCE(v_invitee_points, 0))
    RETURNING * INTO v_invitee_account;
  ELSE
    UPDATE loyalty_accounts
    SET current_points_balance = current_points_balance + COALESCE(v_invitee_points, 0), updated_at = v_now
    WHERE id = v_invitee_account.id;
  END IF;

  IF COALESCE(v_invitee_points, 0) > 0 THEN
    INSERT INTO point_transactions (loyalty_account_id, merchant_customer_id, points_change, transaction_type, description)
    VALUES (v_invitee_account.id, p_merchant_customer_id, v_invitee_points, 'referral_bonus', 'Einladungs-Bonus: Punkte verdoppelt 🎉');
  END IF;

  UPDATE invitation_redemptions
  SET invitee_stamped_at = v_now,
      inviter_stamped_at = v_now
  WHERE id = v_red.id;

  UPDATE invitations SET status = 'converted' WHERE id = v_red.inv_id;

  RETURN json_build_object(
    'processed', true,
    'bonus_awarded', true,
    'inviter_points', COALESCE(v_inviter_points, 0),
    'invitee_points', COALESCE(v_invitee_points, 0),
    'invitee_stamp_points', COALESCE(v_last_stamp_points, 0),
    'inviter_user_id', v_red.inviter_user_id,
    'invitee_user_id', p_user_id,
    'merchant_customer_id', p_merchant_customer_id
  );
END;
$function$;