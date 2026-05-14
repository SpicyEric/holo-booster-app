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
  v_merchant_active boolean;
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
    RETURN json_build_object(
      'success', false,
      'error', 'Dieser Laden ist aktuell nicht aktiv.',
      'error_code', 'merchant_inactive'
    );
  END IF;

  v_merchant_customer_id := v_nfc_chip.merchant_customer_id;
  v_merchant_name := COALESCE(v_nfc_chip.company_name, v_nfc_chip.customer_name);
  v_points_to_award := COALESCE(v_nfc_chip.points_value, 1);

  -- 60-SECOND PER-CHIP COOLDOWN — skip for verification cards (stamp_color='V')
  IF lower(v_nfc_chip.stamp_color) <> 'v' THEN
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
  VALUES (v_loyalty_account.id, v_merchant_customer_id, v_points_to_award, 'nfc_stamp', 'NFC Stempel: ' || v_nfc_chip.stamp_color);

  RETURN json_build_object(
    'success', true,
    'points_awarded', v_points_to_award,
    'total_points', v_new_balance,
    'merchant_customer_id', v_merchant_customer_id,
    'merchant_name', v_merchant_name,
    'stamp_color', v_nfc_chip.stamp_color
  );
END;
$function$;