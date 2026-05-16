
CREATE OR REPLACE FUNCTION public.award_points_via_nfc(p_hardware_uid text, p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_nfc_chip record;
  v_merchant_customer_id uuid;
  v_points_to_award integer;
  v_loyalty_account record;
  v_new_balance integer;
  v_merchant_name text;
  v_last_stamp timestamp with time zone;
  v_is_verify_checkin boolean;
  v_checkin_count integer;
  v_first_checkin boolean;
  v_welcome_reward_id uuid;
  v_welcome_reward_title text;
  v_welcome_already_redeemed boolean;
  v_welcome_redeemed_now boolean := false;
  v_today_checkin timestamp with time zone;
  c_backstube_id constant uuid := 'e828d21a-f7c5-4c8e-bc8d-6301e3e3ab45';
BEGIN
  IF p_hardware_uid IS NULL OR trim(p_hardware_uid) = '' THEN
    RETURN json_build_object('success', false, 'error', 'Keine Hardware-UID übermittelt');
  END IF;

  SELECT nc.*, c.company_name, c.name as customer_name, c.active as merchant_active
  INTO v_nfc_chip
  FROM nfc_chips nc
  JOIN customers c ON c.id = nc.merchant_customer_id
  WHERE lower(nc.hardware_uid) = lower(trim(p_hardware_uid))
    AND nc.is_active = true;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'NFC-Chip nicht registriert');
  END IF;

  IF v_nfc_chip.merchant_active IS DISTINCT FROM true THEN
    RETURN json_build_object('success', false, 'error', 'Dieser Laden ist aktuell nicht aktiv.', 'error_code', 'merchant_inactive');
  END IF;

  v_merchant_customer_id := v_nfc_chip.merchant_customer_id;
  v_merchant_name := COALESCE(v_nfc_chip.company_name, v_nfc_chip.customer_name);
  v_is_verify_checkin := v_merchant_customer_id = c_backstube_id
    AND lower(COALESCE(v_nfc_chip.stamp_color, '')) IN ('v', 'verify');
  v_points_to_award := CASE
    WHEN v_is_verify_checkin THEN 0
    ELSE COALESCE(NULLIF(v_nfc_chip.points_value, 0), 1)
  END;

  IF NOT v_is_verify_checkin THEN
    SELECT MAX(pt.created_at) INTO v_last_stamp
    FROM point_transactions pt
    JOIN loyalty_accounts la ON la.id = pt.loyalty_account_id
    WHERE la.user_id = p_user_id
      AND pt.merchant_customer_id = v_merchant_customer_id
      AND pt.transaction_type = 'nfc_stamp'
      AND pt.description = 'NFC Stempel: ' || v_nfc_chip.stamp_color
      AND pt.created_at > now() - interval '60 seconds';

    IF v_last_stamp IS NOT NULL THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Bitte warte einen Moment, bevor du diesen Stempel erneut verwendest.',
        'error_code', 'cooldown',
        'cooldown_until', (v_last_stamp + interval '60 seconds')
      );
    END IF;

    IF v_merchant_customer_id <> c_backstube_id THEN
      SELECT MAX(pt.created_at) INTO v_today_checkin
      FROM point_transactions pt
      JOIN loyalty_accounts la ON la.id = pt.loyalty_account_id
      WHERE la.user_id = p_user_id
        AND pt.merchant_customer_id = v_merchant_customer_id
        AND pt.transaction_type IN ('nfc_stamp', 'check_in')
        AND pt.created_at::date = current_date;

      IF v_today_checkin IS NOT NULL THEN
        RETURN json_build_object(
          'success', false,
          'error', 'Du hast heute bei diesem Geschäft schon eingecheckt. Komm morgen wieder!',
          'error_code', 'daily_limit'
        );
      END IF;
    END IF;
  END IF;

  SELECT * INTO v_loyalty_account
  FROM loyalty_accounts
  WHERE user_id = p_user_id AND merchant_customer_id = v_merchant_customer_id;

  IF NOT FOUND THEN
    INSERT INTO loyalty_accounts (user_id, merchant_customer_id, current_points_balance)
    VALUES (p_user_id, v_merchant_customer_id, v_points_to_award)
    RETURNING * INTO v_loyalty_account;
    v_new_balance := v_points_to_award;
    v_first_checkin := true;
  ELSE
    SELECT NOT EXISTS (
      SELECT 1
      FROM point_transactions
      WHERE loyalty_account_id = v_loyalty_account.id
        AND merchant_customer_id = v_merchant_customer_id
        AND transaction_type IN ('check_in', 'nfc_stamp')
    ) INTO v_first_checkin;

    UPDATE loyalty_accounts
    SET current_points_balance = current_points_balance + v_points_to_award, updated_at = now()
    WHERE id = v_loyalty_account.id
    RETURNING current_points_balance INTO v_new_balance;
  END IF;

  INSERT INTO point_transactions (loyalty_account_id, merchant_customer_id, points_change, transaction_type, description)
  VALUES (
    v_loyalty_account.id,
    v_merchant_customer_id,
    v_points_to_award,
    CASE WHEN v_is_verify_checkin THEN 'check_in' ELSE 'nfc_stamp' END,
    CASE WHEN v_is_verify_checkin THEN 'Check-in: Verifizierungskarte' ELSE 'NFC Stempel: ' || v_nfc_chip.stamp_color END
  );

  -- Erster Check-in: Visit-1-Prämie (sofern platziert) automatisch einlösen — für ALLE Händler, nicht nur Backstube König
  IF v_first_checkin THEN
    SELECT r.id, r.title
    INTO v_welcome_reward_id, v_welcome_reward_title
    FROM reward_placements rp
    JOIN rewards r ON r.id = rp.reward_id
    WHERE rp.customer_id = v_merchant_customer_id
      AND rp.visit = 1
      AND r.is_active = true
    ORDER BY r.created_at DESC
    LIMIT 1;

    IF v_welcome_reward_id IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1
        FROM point_transactions
        WHERE loyalty_account_id = v_loyalty_account.id
          AND merchant_customer_id = v_merchant_customer_id
          AND transaction_type = 'reward_redeemed'
          AND description = 'Prämie eingelöst: Visit 1: ' || v_welcome_reward_title
      ) INTO v_welcome_already_redeemed;

      IF NOT v_welcome_already_redeemed THEN
        INSERT INTO point_transactions (loyalty_account_id, merchant_customer_id, points_change, transaction_type, description)
        VALUES (v_loyalty_account.id, v_merchant_customer_id, 0, 'reward_redeemed', 'Prämie eingelöst: Visit 1: ' || v_welcome_reward_title);
        v_welcome_redeemed_now := true;
      END IF;
    END IF;
  END IF;

  SELECT COUNT(*) INTO v_checkin_count
  FROM point_transactions
  WHERE loyalty_account_id = v_loyalty_account.id
    AND merchant_customer_id = v_merchant_customer_id
    AND transaction_type IN ('check_in', 'nfc_stamp');

  RETURN json_build_object(
    'success', true,
    'points_awarded', v_points_to_award,
    'total_points', v_new_balance,
    'check_ins', v_checkin_count,
    'is_check_in', v_is_verify_checkin,
    'merchant_customer_id', v_merchant_customer_id,
    'merchant_name', v_merchant_name,
    'stamp_color', v_nfc_chip.stamp_color,
    'welcome_reward_redeemed', v_welcome_redeemed_now,
    'welcome_reward_label', v_welcome_reward_title
  );
END;
$function$;
