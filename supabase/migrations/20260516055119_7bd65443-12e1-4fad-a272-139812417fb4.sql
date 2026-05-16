CREATE OR REPLACE FUNCTION public.award_points_via_nfc_with_activated_rewards(
  p_hardware_uid text,
  p_user_id uuid,
  p_activated_rewards jsonb DEFAULT '[]'::jsonb
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
  v_checkin_count integer;
  v_loyalty RECORD;
  v_reward jsonb;
  v_visit integer;
  v_label text;
  v_desc text;
  v_already boolean;
  v_exists boolean;
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
  v_checkin_count := COALESCE(NULLIF(v_award ->> 'check_ins', '')::integer, 0);

  IF v_merchant_customer_id IS NULL THEN
    RETURN v_award;
  END IF;

  SELECT reward INTO v_reward
  FROM jsonb_array_elements(COALESCE(p_activated_rewards, '[]'::jsonb)) AS reward
  WHERE NULLIF(reward ->> 'merchantId', '')::uuid = v_merchant_customer_id
     OR NULLIF(reward ->> 'merchant_customer_id', '')::uuid = v_merchant_customer_id
  LIMIT 1;

  IF v_reward IS NULL THEN
    RETURN (v_award::jsonb || jsonb_build_object(
      'activated_reward_redeemed', false,
      'activated_reward_error', 'Keine passende aktivierte Prämie für diesen Händler gefunden'
    ))::json;
  END IF;

  v_visit := COALESCE(NULLIF(v_reward ->> 'visitNumber', '')::integer, NULLIF(v_reward ->> 'visit_number', '')::integer);
  v_label := trim(COALESCE(v_reward ->> 'label', v_reward ->> 'reward_label', ''));

  IF v_visit IS NULL OR v_label = '' THEN
    RETURN (v_award::jsonb || jsonb_build_object(
      'activated_reward_redeemed', false,
      'activated_reward_error', 'Aktivierte Prämie ist unvollständig'
    ))::json;
  END IF;

  IF v_visit > v_checkin_count THEN
    RETURN (v_award::jsonb || jsonb_build_object(
      'activated_reward_redeemed', false,
      'activated_reward_error', 'Prämie ist noch nicht freigeschaltet',
      'activated_reward_visit_number', v_visit,
      'activated_reward_label', v_label
    ))::json;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.reward_placements rp
    JOIN public.rewards r ON r.id = rp.reward_id
    WHERE rp.customer_id = v_merchant_customer_id
      AND rp.visit = v_visit
      AND r.is_active = true
      AND trim(r.title) = v_label
  ) INTO v_exists;

  IF NOT v_exists THEN
    RETURN (v_award::jsonb || jsonb_build_object(
      'activated_reward_redeemed', false,
      'activated_reward_error', 'Prämie gehört nicht zu diesem Treuepass',
      'activated_reward_visit_number', v_visit,
      'activated_reward_label', v_label
    ))::json;
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

  v_desc := 'Prämie eingelöst: Visit ' || v_visit || ': ' || v_label;

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
    'activated_reward_merchant_customer_id', v_merchant_customer_id,
    'activated_reward_visit_number', v_visit,
    'activated_reward_label', v_label,
    'welcome_reward_redeemed', true,
    'welcome_reward_label', v_label
  ))::json;
END;
$$;