
CREATE OR REPLACE FUNCTION public.award_points_via_nfc(p_chip_data text, p_hardware_uid text, p_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_effective_hardware_uid text;
  v_nfc_chip record;
  v_merchant_customer_id uuid;
  v_points_to_award integer;
  v_loyalty_account record;
  v_new_balance integer;
  v_last_stamp timestamp with time zone;
  v_merchant_name text;
BEGIN
  -- Try hardware_uid first, fall back to chip_data (NDEF/chip_uid) lookup
  IF p_hardware_uid IS NOT NULL AND trim(p_hardware_uid) != '' THEN
    -- New flow: lookup by hardware UID directly
    RETURN public.award_points_via_nfc(p_hardware_uid, p_user_id);
  END IF;

  -- Old flow: p_hardware_uid is empty, use p_chip_data to find the chip by chip_uid
  IF p_chip_data IS NULL OR trim(p_chip_data) = '' THEN
    RETURN json_build_object('success', false, 'error', 'Keine Chip-Daten übermittelt');
  END IF;

  -- Find NFC chip by chip_uid (NDEF data from old app)
  SELECT nc.*, c.company_name, c.name as customer_name
  INTO v_nfc_chip
  FROM nfc_chips nc
  JOIN customers c ON c.id = nc.merchant_customer_id
  WHERE lower(nc.chip_uid) = lower(trim(p_chip_data))
    AND nc.is_active = true;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'NFC-Chip nicht registriert');
  END IF;

  -- If we found the chip by chip_uid and it has a hardware_uid, use the 2-param version
  IF v_nfc_chip.hardware_uid IS NOT NULL AND trim(v_nfc_chip.hardware_uid) != '' THEN
    RETURN public.award_points_via_nfc(v_nfc_chip.hardware_uid, p_user_id);
  END IF;

  -- Chip has no hardware_uid stored, do the full award logic inline
  v_merchant_customer_id := v_nfc_chip.merchant_customer_id;
  v_merchant_name := COALESCE(v_nfc_chip.company_name, v_nfc_chip.customer_name);
  v_points_to_award := COALESCE(v_nfc_chip.points_value, 1);

  -- 10-MINUTE COOLDOWN CHECK
  SELECT MAX(pt.created_at) INTO v_last_stamp
  FROM point_transactions pt
  JOIN loyalty_accounts la ON la.id = pt.loyalty_account_id
  WHERE la.user_id = p_user_id
    AND pt.merchant_customer_id = v_merchant_customer_id
    AND pt.transaction_type = 'nfc_stamp'
    AND pt.description = 'NFC Stempel: ' || v_nfc_chip.stamp_color
    AND pt.created_at > now() - interval '10 minutes';

  IF v_last_stamp IS NOT NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Du hast innerhalb der letzten 10 Minuten bereits Punkte mit diesem Stempel erhalten.',
      'error_code', 'cooldown',
      'cooldown_until', (v_last_stamp + interval '10 minutes')
    );
  END IF;

  -- Get or create loyalty account
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

  -- Log transaction
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
$$;
