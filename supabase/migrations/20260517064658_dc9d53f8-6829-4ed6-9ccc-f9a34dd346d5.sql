DROP FUNCTION IF EXISTS public.redeem_activated_reward(uuid, integer, text);

CREATE OR REPLACE FUNCTION public.redeem_activated_reward(
  p_merchant_customer_id uuid,
  p_visit_number integer,
  p_reward_label text,
  p_verification_code text DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_loyalty RECORD;
  v_already boolean;
  v_desc text;
  v_code text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Nicht authentifiziert');
  END IF;

  IF p_visit_number IS NULL OR p_reward_label IS NULL OR trim(p_reward_label) = '' THEN
    RETURN json_build_object('success', false, 'error', 'Ungültige Parameter');
  END IF;

  SELECT * INTO v_loyalty FROM loyalty_accounts
  WHERE user_id = v_user_id AND merchant_customer_id = p_merchant_customer_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Kein Loyalty-Account gefunden');
  END IF;

  v_code := NULLIF(trim(coalesce(p_verification_code, '')), '');

  v_desc := 'Prämie eingelöst: Visit ' || p_visit_number || ': ' || p_reward_label;
  IF v_code IS NOT NULL THEN
    v_desc := v_desc || ' (Code: ' || v_code || ')';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM point_transactions
    WHERE loyalty_account_id = v_loyalty.id
      AND merchant_customer_id = p_merchant_customer_id
      AND transaction_type = 'reward_redeemed'
      AND description LIKE 'Prämie eingelöst: Visit ' || p_visit_number || ': ' || p_reward_label || '%'
  ) INTO v_already;

  IF v_already THEN
    RETURN json_build_object('success', false, 'error', 'Bereits eingelöst', 'error_code', 'already_redeemed');
  END IF;

  INSERT INTO point_transactions (loyalty_account_id, merchant_customer_id, points_change, transaction_type, description)
  VALUES (v_loyalty.id, p_merchant_customer_id, 0, 'reward_redeemed', v_desc);

  RETURN json_build_object('success', true, 'visit_number', p_visit_number, 'label', p_reward_label, 'verification_code', v_code);
END;
$$;