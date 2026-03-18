CREATE OR REPLACE FUNCTION public.redeem_message_offer_via_nfc(
  p_message_id uuid,
  p_user_id uuid,
  p_chip_data text,
  p_hardware_uid text DEFAULT NULL::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_message RECORD;
  v_offer RECORD;
  v_now TIMESTAMP WITH TIME ZONE := now();
  v_box_id text;
  v_stamp_color text;
  v_box_record RECORD;
  v_customer_box RECORD;
  v_nfc_chip RECORD;
  v_award_result json;
  v_loyalty_account_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Nicht authentifiziert', 'error_code', 'unauthorized');
  END IF;

  IF p_user_id IS NULL OR p_user_id <> auth.uid() THEN
    RETURN json_build_object('success', false, 'error', 'Ungültiger Benutzer', 'error_code', 'forbidden');
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

  -- Parse NFC chip data (BOX_ID:COLOR)
  IF position(':' in p_chip_data) = 0 THEN
    RETURN json_build_object('success', false, 'error', 'Ungültiges NFC-Datenformat', 'error_code', 'invalid_nfc_data');
  END IF;

  v_box_id := upper(trim(split_part(p_chip_data, ':', 1)));
  v_stamp_color := lower(trim(split_part(p_chip_data, ':', 2)));

  IF NOT v_box_id ~ '^[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$' THEN
    RETURN json_build_object('success', false, 'error', 'Ungültige Box-ID', 'error_code', 'invalid_box');
  END IF;

  SELECT * INTO v_box_record
  FROM boxes
  WHERE box_id = v_box_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Box nicht registriert', 'error_code', 'box_not_found');
  END IF;

  SELECT cb.customer_id
  INTO v_customer_box
  FROM customer_boxes cb
  WHERE cb.box_id = v_box_record.id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Box keinem Händler zugewiesen', 'error_code', 'box_unassigned');
  END IF;

  IF v_customer_box.customer_id <> v_message.merchant_customer_id THEN
    RETURN json_build_object('success', false, 'error', 'Dieser Stempel gehört nicht zu diesem Geschäft', 'error_code', 'wrong_merchant');
  END IF;

  SELECT *
  INTO v_nfc_chip
  FROM nfc_chips
  WHERE merchant_customer_id = v_message.merchant_customer_id
    AND lower(stamp_color) = v_stamp_color
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Stempelfarbe nicht konfiguriert', 'error_code', 'chip_not_configured');
  END IF;

  IF v_nfc_chip.hardware_uid IS NOT NULL THEN
    IF p_hardware_uid IS NULL OR lower(p_hardware_uid) <> lower(v_nfc_chip.hardware_uid) THEN
      RETURN json_build_object('success', false, 'error', 'Ungültiger NFC-Chip: Hardware-ID stimmt nicht überein', 'error_code', 'invalid_hardware_uid');
    END IF;
  END IF;

  -- Award points via existing secure NFC award function
  v_award_result := public.award_points_via_nfc(p_chip_data, auth.uid(), p_hardware_uid);

  IF COALESCE((v_award_result->>'success')::boolean, false) = false THEN
    RETURN v_award_result;
  END IF;

  -- Mark offer as redeemed (idempotency guard)
  UPDATE app_messages
  SET offer_redeemed_at = v_now
  WHERE id = v_message.id
    AND user_id = auth.uid()
    AND offer_redeemed_at IS NULL;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Dieses Angebot wurde bereits eingelöst', 'error_code', 'already_redeemed');
  END IF;

  -- Log offer redemption as transaction proof
  SELECT id INTO v_loyalty_account_id
  FROM loyalty_accounts
  WHERE user_id = auth.uid()
    AND merchant_customer_id = v_message.merchant_customer_id
  LIMIT 1;

  IF v_loyalty_account_id IS NOT NULL THEN
    INSERT INTO point_transactions (
      loyalty_account_id,
      merchant_customer_id,
      points_change,
      transaction_type,
      description
    ) VALUES (
      v_loyalty_account_id,
      v_message.merchant_customer_id,
      0,
      'offer_redeemed',
      'Angebot eingelöst: ' || COALESCE(v_offer.title, 'Angebot')
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'offer_redeemed_at', v_now,
    'points_awarded', COALESCE((v_award_result->>'points_awarded')::int, 0),
    'total_points', (v_award_result->>'total_points')::int,
    'merchant_customer_id', v_message.merchant_customer_id,
    'merchant_name', v_award_result->>'merchant_name'
  );
END;
$function$;