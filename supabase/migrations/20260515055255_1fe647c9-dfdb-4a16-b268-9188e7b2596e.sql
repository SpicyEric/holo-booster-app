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
  v_welcome_reward record;
  v_welcome_already_redeemed boolean;
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
  v_is_verify_checkin := v_merchant_customer_id = 'e828d21a-f7c5-4c8e-bc8d-6301e3e3ab45'::uuid
    AND lower(COALESCE(v_nfc_chip.stamp_color, '')) IN ('v', 'verify');
  v_points_to_award := CASE
    WHEN v_is_verify_checkin THEN 0
    ELSE COALESCE(NULLIF(v_nfc_chip.points_value, 0), 1)
  END;

  -- 60s cooldown only applies to normal point cards, not to this verification check-in card.
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

  IF v_is_verify_checkin AND v_first_checkin THEN
    SELECT rp.visit, r.id, r.title
    INTO v_welcome_reward
    FROM reward_placements rp
    JOIN rewards r ON r.id = rp.reward_id
    WHERE rp.customer_id = v_merchant_customer_id
      AND rp.visit = 1
      AND r.is_active = true
    ORDER BY r.created_at DESC
    LIMIT 1;

    IF FOUND THEN
      SELECT EXISTS (
        SELECT 1
        FROM point_transactions
        WHERE loyalty_account_id = v_loyalty_account.id
          AND merchant_customer_id = v_merchant_customer_id
          AND transaction_type = 'reward_redeemed'
          AND description = 'Prämie eingelöst: Visit 1: ' || v_welcome_reward.title
      ) INTO v_welcome_already_redeemed;

      IF NOT v_welcome_already_redeemed THEN
        INSERT INTO point_transactions (loyalty_account_id, merchant_customer_id, points_change, transaction_type, description)
        VALUES (v_loyalty_account.id, v_merchant_customer_id, 0, 'reward_redeemed', 'Prämie eingelöst: Visit 1: ' || v_welcome_reward.title);
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
    'welcome_reward_redeemed', v_is_verify_checkin AND v_first_checkin AND v_welcome_reward.id IS NOT NULL,
    'welcome_reward_label', CASE WHEN v_welcome_reward.id IS NOT NULL THEN v_welcome_reward.title ELSE NULL END
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.award_points_via_nfc(p_chip_data text, p_hardware_uid text, p_user_id uuid)
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
  v_last_stamp timestamp with time zone;
  v_merchant_name text;
  v_is_verify_checkin boolean;
BEGIN
  IF p_hardware_uid IS NOT NULL AND trim(p_hardware_uid) != '' THEN
    SELECT nc.*, c.company_name, c.name as customer_name
    INTO v_nfc_chip
    FROM nfc_chips nc
    JOIN customers c ON c.id = nc.merchant_customer_id
    WHERE lower(nc.hardware_uid) = lower(trim(p_hardware_uid))
      AND nc.is_active = true;

    IF FOUND THEN
      RETURN public.award_points_via_nfc(p_hardware_uid, p_user_id);
    END IF;
  END IF;

  IF p_chip_data IS NOT NULL AND trim(p_chip_data) != '' THEN
    SELECT nc.*, c.company_name, c.name as customer_name
    INTO v_nfc_chip
    FROM nfc_chips nc
    JOIN customers c ON c.id = nc.merchant_customer_id
    WHERE lower(nc.chip_uid) = lower(trim(p_chip_data))
      AND nc.is_active = true;

    IF NOT FOUND THEN
      DECLARE
        v_parts text[];
        v_box_id text;
        v_color text;
      BEGIN
        v_parts := string_to_array(p_chip_data, ':');
        IF array_length(v_parts, 1) = 2 THEN
          v_box_id := v_parts[1];
          v_color := v_parts[2];
          
          SELECT nc.*, c.company_name, c.name as customer_name
          INTO v_nfc_chip
          FROM nfc_chips nc
          JOIN customers c ON c.id = nc.merchant_customer_id
          JOIN customer_boxes cb ON cb.customer_id = nc.merchant_customer_id
          JOIN boxes b ON b.id = cb.box_id
          WHERE lower(b.box_id) = lower(trim(v_box_id))
            AND lower(nc.stamp_color) = lower(trim(v_color))
            AND nc.is_active = true
          LIMIT 1;
        END IF;
      END;
    END IF;

    IF NOT FOUND THEN
      RETURN json_build_object('success', false, 'error', 'NFC-Chip nicht registriert');
    END IF;

    IF p_hardware_uid IS NOT NULL AND trim(p_hardware_uid) != '' 
       AND (v_nfc_chip.hardware_uid IS NULL OR trim(v_nfc_chip.hardware_uid) = '') THEN
      UPDATE nfc_chips SET hardware_uid = lower(trim(p_hardware_uid)) WHERE id = v_nfc_chip.id;
    END IF;

    IF v_nfc_chip.hardware_uid IS NOT NULL AND trim(v_nfc_chip.hardware_uid) != '' THEN
      RETURN public.award_points_via_nfc(v_nfc_chip.hardware_uid, p_user_id);
    END IF;

    v_merchant_customer_id := v_nfc_chip.merchant_customer_id;
    v_merchant_name := COALESCE(v_nfc_chip.company_name, v_nfc_chip.customer_name);
    v_is_verify_checkin := v_merchant_customer_id = 'e828d21a-f7c5-4c8e-bc8d-6301e3e3ab45'::uuid
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
    END IF;

    SELECT * INTO v_loyalty_account
    FROM loyalty_accounts
    WHERE user_id = p_user_id AND merchant_customer_id = v_merchant_customer_id;

    IF NOT FOUND THEN
      INSERT INTO loyalty_accounts (user_id, merchant_customer_id, current_points_balance)
      VALUES (p_user_id, v_merchant_customer_id, v_points_to_award)
      RETURNING * INTO v_loyalty_account;
      v_new_balance := v_points_to_award;
    ELSE
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

    RETURN json_build_object(
      'success', true,
      'points_awarded', v_points_to_award,
      'total_points', v_new_balance,
      'is_check_in', v_is_verify_checkin,
      'merchant_customer_id', v_merchant_customer_id,
      'merchant_name', v_merchant_name,
      'stamp_color', v_nfc_chip.stamp_color
    );
  END IF;

  RETURN json_build_object('success', false, 'error', 'Keine Chip-Daten übermittelt');
END;
$function$;