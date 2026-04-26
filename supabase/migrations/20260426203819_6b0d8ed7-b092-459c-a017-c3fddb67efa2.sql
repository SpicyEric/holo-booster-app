-- Empfehlungen: Invitee-Bonus = Punkte des ersten Stempels (effektiv verdoppelt)
-- Ersetzt die starre referral_invitee_points-Logik durch eine dynamische Berechnung,
-- die den Wert des Stempels ausliest, der den Bonus ausgelöst hat.

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

  -- Inviter-Bonus: Konfigurierbar (referral_inviter_points, default 20)
  SELECT COALESCE(referral_inviter_points, 20)
  INTO v_inviter_points
  FROM customers WHERE id = p_merchant_customer_id;

  -- Invitee-Bonus: Punkte des LETZTEN NFC-Stempels des Invitee bei diesem Händler
  -- (das ist der Stempel, der den Bonus gerade ausgelöst hat) — effektiv "verdoppelt"
  SELECT COALESCE(pt.points_change, 0)
  INTO v_invitee_points
  FROM point_transactions pt
  JOIN loyalty_accounts la ON la.id = pt.loyalty_account_id
  WHERE la.user_id = p_user_id
    AND la.merchant_customer_id = p_merchant_customer_id
    AND pt.transaction_type = 'nfc_scan'
  ORDER BY pt.created_at DESC
  LIMIT 1;

  v_invitee_points := COALESCE(v_invitee_points, 0);

  -- Inviter Bonus
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

  -- Invitee Bonus (= Wert des ersten Stempels → verdoppelt)
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

  UPDATE invitation_redemptions
  SET invitee_stamped_at = v_now,
      inviter_stamped_at = v_now
  WHERE id = v_red.id;

  UPDATE invitations SET status = 'converted' WHERE id = v_red.inv_id;

  RETURN json_build_object(
    'processed', true,
    'bonus_awarded', true,
    'inviter_points', v_inviter_points,
    'invitee_points', v_invitee_points,
    'inviter_user_id', v_red.inviter_user_id,
    'invitee_user_id', p_user_id,
    'merchant_customer_id', p_merchant_customer_id
  );
END;
$function$;

-- Empfehlungen sind ab sofort immer aktiv (kein Toggle mehr im Backoffice)
ALTER TABLE public.customers
  ALTER COLUMN referral_enabled SET DEFAULT true;

UPDATE public.customers SET referral_enabled = true WHERE referral_enabled = false;