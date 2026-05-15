CREATE OR REPLACE FUNCTION public.award_points_via_nfc_with_reward(
  p_hardware_uid text,
  p_user_id uuid,
  p_activated_visit_number integer,
  p_activated_reward_label text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_award json;
  v_success boolean;
  v_merchant_customer_id uuid;
  v_loyalty RECORD;
  v_desc text;
  v_already boolean;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Kein Nutzer übermittelt');
  END IF;

  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RETURN json_build_object('success', false, 'error', 'Session passt nicht zum Nutzer');
  END IF;

  v_award := public.award_points_via_nfc(p_hardware_uid, p_user_id);
  v_success := COALESCE((v_award ->> 'success')::boolean, false);

  IF NOT v_success THEN
    RETURN v_award;
  END IF;

  v_merchant_customer_id := NULLIF(v_award ->> 'merchant_customer_id', '')::uuid;

  IF p_activated_visit_number IS NULL
    OR p_activated_reward_label IS NULL
    OR trim(p_activated_reward_label) = ''
    OR v_merchant_customer_id IS NULL THEN
    RETURN v_award;
  END IF;

  SELECT * INTO v_loyalty
  FROM public.loyalty_accounts
  WHERE user_id = p_user_id
    AND merchant_customer_id = v_merchant_customer_id;

  IF NOT FOUND THEN
    RETURN (v_award::jsonb || jsonb_build_object(
      'activated_reward_redeemed', false,
      'activated_reward_error', 'Kein Loyalty-Account gefunden'
    ))::json;
  END IF;

  v_desc := 'Prämie eingelöst: Visit ' || p_activated_visit_number || ': ' || trim(p_activated_reward_label);

  SELECT EXISTS (
    SELECT 1
    FROM public.point_transactions
    WHERE loyalty_account_id = v_loyalty.id
      AND merchant_customer_id = v_merchant_customer_id
      AND transaction_type = 'reward_redeemed'
      AND description = v_desc
  ) INTO v_already;

  IF NOT v_already THEN
    INSERT INTO public.point_transactions (
      loyalty_account_id,
      merchant_customer_id,
      points_change,
      transaction_type,
      description
    ) VALUES (
      v_loyalty.id,
      v_merchant_customer_id,
      0,
      'reward_redeemed',
      v_desc
    );
  END IF;

  RETURN (v_award::jsonb || jsonb_build_object(
    'activated_reward_redeemed', true,
    'activated_reward_already_redeemed', v_already,
    'activated_reward_visit_number', p_activated_visit_number,
    'activated_reward_label', trim(p_activated_reward_label),
    'welcome_reward_redeemed', true,
    'welcome_reward_label', trim(p_activated_reward_label)
  ))::json;
END;
$$;