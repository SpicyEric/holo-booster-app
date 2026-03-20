
CREATE OR REPLACE FUNCTION public.award_points_via_nfc(p_chip_data text, p_user_id uuid, p_hardware_uid text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_box_id text;
  v_stamp_color text;
  v_box_record record;
  v_customer_box record;
  v_merchant_customer_id uuid;
  v_nfc_chip record;
  v_points_to_award integer;
  v_loyalty_account record;
  v_new_balance integer;
  v_last_stamp timestamp with time zone;
BEGIN
  -- Parse the chip data (format: "BOX_ID:COLOR")
  IF position(':' in p_chip_data) = 0 THEN
    RETURN json_build_object('success', false, 'error', 'Ungültiges NFC-Datenformat');
  END IF;
  
  v_box_id := upper(trim(split_part(p_chip_data, ':', 1)));
  v_stamp_color := lower(trim(split_part(p_chip_data, ':', 2)));
  
  -- Validate box_id format (XXXXX-XXXXX-XXXXX)
  IF NOT v_box_id ~ '^[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$' THEN
    RETURN json_build_object('success', false, 'error', 'Ungültige Box-ID');
  END IF;
  
  -- Find the box in the registry
  SELECT * INTO v_box_record FROM boxes WHERE box_id = v_box_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Box nicht registriert');
  END IF;
  
  -- Find which customer has this box
  SELECT cb.*, c.company_name, c.name as customer_name
  INTO v_customer_box
  FROM customer_boxes cb
  JOIN customers c ON c.id = cb.customer_id
  WHERE cb.box_id = v_box_record.id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Box keinem Händler zugewiesen');
  END IF;
  
  v_merchant_customer_id := v_customer_box.customer_id;
  
  -- Find the NFC chip configuration for this merchant + color
  SELECT * INTO v_nfc_chip
  FROM nfc_chips
  WHERE merchant_customer_id = v_merchant_customer_id
    AND lower(stamp_color) = v_stamp_color
    AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Stempelfarbe nicht konfiguriert: ' || v_stamp_color);
  END IF;
  
  -- SECURITY CHECK: Verify hardware UID if the chip has one registered
  IF v_nfc_chip.hardware_uid IS NOT NULL THEN
    IF p_hardware_uid IS NULL OR lower(p_hardware_uid) != lower(v_nfc_chip.hardware_uid) THEN
      RETURN json_build_object('success', false, 'error', 'Ungültiger NFC-Chip: Hardware-ID stimmt nicht überein');
    END IF;
  END IF;
  
  -- 10-MINUTE COOLDOWN CHECK per user + merchant + stamp_color
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
      'error', 'Du hast innerhalb der letzten 10 Minuten bereits Punkte mit diesem Stempel erhalten. Bitte warte einen Moment.',
      'error_code', 'cooldown',
      'cooldown_until', (v_last_stamp + interval '10 minutes')
    );
  END IF;
  
  v_points_to_award := COALESCE(v_nfc_chip.points_value, 1);
  
  -- Get or create loyalty account for this user + merchant
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
    SET current_points_balance = current_points_balance + v_points_to_award,
        updated_at = now()
    WHERE id = v_loyalty_account.id
    RETURNING current_points_balance INTO v_new_balance;
  END IF;
  
  -- Log the transaction
  INSERT INTO point_transactions (
    loyalty_account_id,
    merchant_customer_id,
    points_change,
    transaction_type,
    description
  ) VALUES (
    v_loyalty_account.id,
    v_merchant_customer_id,
    v_points_to_award,
    'nfc_stamp',
    'NFC Stempel: ' || v_nfc_chip.stamp_color
  );
  
  RETURN json_build_object(
    'success', true,
    'points_awarded', v_points_to_award,
    'total_points', v_new_balance,
    'merchant_customer_id', v_merchant_customer_id,
    'merchant_name', COALESCE(v_customer_box.company_name, v_customer_box.customer_name),
    'stamp_color', v_nfc_chip.stamp_color
  );
END;
$function$;
