
-- Update 3-param overload to backfill hardware_uid when chip found via chip_uid
CREATE OR REPLACE FUNCTION public.award_points_via_nfc(p_chip_data text, p_hardware_uid text, p_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
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
    -- Try hardware UID lookup first
    SELECT nc.*, c.company_name, c.name as customer_name
    INTO v_nfc_chip
    FROM nfc_chips nc
    JOIN customers c ON c.id = nc.merchant_customer_id
    WHERE lower(nc.hardware_uid) = lower(trim(p_hardware_uid))
      AND nc.is_active = true;

    IF FOUND THEN
      -- Hardware UID found, delegate to 2-param version
      RETURN public.award_points_via_nfc(p_hardware_uid, p_user_id);
    END IF;
    -- Hardware UID not found in DB, fall through to chip_data lookup
  END IF;

  -- Try chip_data (NDEF) lookup
  IF p_chip_data IS NOT NULL AND trim(p_chip_data) != '' THEN
    -- Try exact chip_uid match first
    SELECT nc.*, c.company_name, c.name as customer_name
    INTO v_nfc_chip
    FROM nfc_chips nc
    JOIN customers c ON c.id = nc.merchant_customer_id
    WHERE lower(nc.chip_uid) = lower(trim(p_chip_data))
      AND nc.is_active = true;

    IF NOT FOUND THEN
      -- Try matching by box_id prefix (chip_data format: "BOX_ID:COLOR")
      DECLARE
        v_parts text[];
        v_box_id text;
        v_color text;
      BEGIN
        v_parts := string_to_array(p_chip_data, ':');
        IF array_length(v_parts, 1) = 2 THEN
          v_box_id := v_parts[1];
          v_color := v_parts[2];
          
          -- Find chip by box_id (via customer_boxes) and color
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

    -- Backfill hardware_uid if we have it and chip doesn't have one yet
    IF p_hardware_uid IS NOT NULL AND trim(p_hardware_uid) != '' 
       AND (v_nfc_chip.hardware_uid IS NULL OR trim(v_nfc_chip.hardware_uid) = '') THEN
      UPDATE nfc_chips SET hardware_uid = lower(trim(p_hardware_uid)) WHERE id = v_nfc_chip.id;
      RAISE NOTICE 'Backfilled hardware_uid % for chip %', p_hardware_uid, v_nfc_chip.id;
    END IF;

    -- If chip already has hardware_uid stored, delegate to 2-param version
    IF v_nfc_chip.hardware_uid IS NOT NULL AND trim(v_nfc_chip.hardware_uid) != '' THEN
      RETURN public.award_points_via_nfc(v_nfc_chip.hardware_uid, p_user_id);
    END IF;

    -- Chip has no hardware_uid stored, do full award logic inline
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
  END IF;

  -- Neither hardware_uid nor chip_data provided
  RETURN json_build_object('success', false, 'error', 'Keine Chip-Daten übermittelt');
END;
$$;
