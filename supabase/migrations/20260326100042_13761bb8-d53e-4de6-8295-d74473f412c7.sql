
-- =====================================================
-- Refactor award_points_via_nfc to use hardware_uid ONLY
-- No more chip_data (box_id:color) parsing needed.
-- The NFC chip is identified solely by its hardware UID.
-- =====================================================

-- Drop old function signatures
DROP FUNCTION IF EXISTS public.award_points_via_nfc(text, uuid, text);
DROP FUNCTION IF EXISTS public.award_points_via_nfc(text, uuid);

-- New function: lookup by hardware_uid directly
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
  v_last_stamp timestamp with time zone;
  v_merchant_name text;
BEGIN
  -- Validate input
  IF p_hardware_uid IS NULL OR trim(p_hardware_uid) = '' THEN
    RETURN json_build_object('success', false, 'error', 'Keine Hardware-UID übermittelt');
  END IF;

  -- Find NFC chip by hardware UID
  SELECT nc.*, c.company_name, c.name as customer_name
  INTO v_nfc_chip
  FROM nfc_chips nc
  JOIN customers c ON c.id = nc.merchant_customer_id
  WHERE lower(nc.hardware_uid) = lower(trim(p_hardware_uid))
    AND nc.is_active = true;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'NFC-Chip nicht registriert');
  END IF;

  v_merchant_customer_id := v_nfc_chip.merchant_customer_id;
  v_merchant_name := COALESCE(v_nfc_chip.company_name, v_nfc_chip.customer_name);
  v_points_to_award := COALESCE(v_nfc_chip.points_value, 1);

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
    'merchant_name', v_merchant_name,
    'stamp_color', v_nfc_chip.stamp_color
  );
END;
$function$;

-- =====================================================
-- Refactor redeem_message_offer_via_nfc to use hardware_uid ONLY
-- =====================================================

DROP FUNCTION IF EXISTS public.redeem_message_offer_via_nfc(uuid, uuid, text, text);

CREATE OR REPLACE FUNCTION public.redeem_message_offer_via_nfc(p_message_id uuid, p_user_id uuid, p_hardware_uid text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_message RECORD;
  v_offer RECORD;
  v_now TIMESTAMP WITH TIME ZONE := now();
  v_nfc_chip RECORD;
  v_loyalty_account_id uuid;
  v_points_to_award integer;
  v_loyalty_account RECORD;
  v_new_balance integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Nicht authentifiziert', 'error_code', 'unauthorized');
  END IF;

  IF p_user_id IS NULL OR p_user_id <> auth.uid() THEN
    RETURN json_build_object('success', false, 'error', 'Ungültiger Benutzer', 'error_code', 'forbidden');
  END IF;

  -- Validate hardware UID
  IF p_hardware_uid IS NULL OR trim(p_hardware_uid) = '' THEN
    RETURN json_build_object('success', false, 'error', 'Keine Hardware-UID übermittelt', 'error_code', 'invalid_nfc_data');
  END IF;

  SELECT id, user_id, offer_id, offer_redeemed_at, merchant_customer_id
  INTO v_message
  FROM app_messages
  WHERE id = p_message_id
    AND user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Nachricht nicht gefunden', 'error_code', 'not_found');
  END IF;

  IF v_message.offer_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Diese Nachricht enthält kein Angebot', 'error_code', 'no_offer');
  END IF;

  IF v_message.offer_redeemed_at IS NOT NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Dieses Angebot wurde bereits eingelöst',
      'error_code', 'already_redeemed',
      'offer_redeemed_at', v_message.offer_redeemed_at
    );
  END IF;

  SELECT id, title, valid_until, is_active
  INTO v_offer
  FROM offers
  WHERE id = v_message.offer_id;

  IF NOT FOUND OR v_offer.is_active IS DISTINCT FROM true THEN
    RETURN json_build_object('success', false, 'error', 'Dieses Angebot ist nicht mehr aktiv', 'error_code', 'inactive_offer');
  END IF;

  IF v_offer.valid_until IS NOT NULL AND v_offer.valid_until <= v_now THEN
    RETURN json_build_object('success', false, 'error', 'Diese Prämie ist leider abgelaufen', 'error_code', 'expired_offer');
  END IF;

  -- Find NFC chip by hardware UID
  SELECT *
  INTO v_nfc_chip
  FROM nfc_chips
  WHERE lower(hardware_uid) = lower(trim(p_hardware_uid))
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'NFC-Chip nicht registriert', 'error_code', 'chip_not_found');
  END IF;

  -- Verify chip belongs to the correct merchant
  IF v_nfc_chip.merchant_customer_id <> v_message.merchant_customer_id THEN
    RETURN json_build_object('success', false, 'error', 'Dieser Stempel gehört nicht zu diesem Geschäft', 'error_code', 'wrong_merchant');
  END IF;

  -- Award points via the new hardware-UID-based function
  v_points_to_award := COALESCE(v_nfc_chip.points_value, 1);

  SELECT * INTO v_loyalty_account
  FROM loyalty_accounts
  WHERE user_id = auth.uid() AND merchant_customer_id = v_message.merchant_customer_id;

  IF NOT FOUND THEN
    INSERT INTO loyalty_accounts (user_id, merchant_customer_id, current_points_balance)
    VALUES (auth.uid(), v_message.merchant_customer_id, v_points_to_award)
    RETURNING * INTO v_loyalty_account;
    v_new_balance := v_points_to_award;
  ELSE
    UPDATE loyalty_accounts
    SET current_points_balance = current_points_balance + v_points_to_award, updated_at = now()
    WHERE id = v_loyalty_account.id
    RETURNING current_points_balance INTO v_new_balance;
  END IF;

  INSERT INTO point_transactions (loyalty_account_id, merchant_customer_id, points_change, transaction_type, description)
  VALUES (v_loyalty_account.id, v_message.merchant_customer_id, v_points_to_award, 'nfc_stamp', 'NFC Stempel: ' || v_nfc_chip.stamp_color);

  -- Mark offer as redeemed
  UPDATE app_messages
  SET offer_redeemed_at = v_now
  WHERE id = v_message.id
    AND user_id = auth.uid()
    AND offer_redeemed_at IS NULL;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Dieses Angebot wurde bereits eingelöst', 'error_code', 'already_redeemed');
  END IF;

  -- Log offer redemption
  INSERT INTO point_transactions (loyalty_account_id, merchant_customer_id, points_change, transaction_type, description)
  VALUES (v_loyalty_account.id, v_message.merchant_customer_id, 0, 'offer_redeemed', 'Angebot eingelöst: ' || COALESCE(v_offer.title, 'Angebot'));

  RETURN json_build_object(
    'success', true,
    'offer_redeemed_at', v_now,
    'points_awarded', v_points_to_award,
    'total_points', v_new_balance,
    'merchant_customer_id', v_message.merchant_customer_id
  );
END;
$function$;

-- Ensure index on hardware_uid for fast lookups
CREATE INDEX IF NOT EXISTS idx_nfc_chips_hardware_uid_lower ON public.nfc_chips (lower(hardware_uid)) WHERE hardware_uid IS NOT NULL AND is_active = true;
