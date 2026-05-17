CREATE OR REPLACE FUNCTION public.calc_boost_reward(p_referral_index integer)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $function$
  SELECT CASE
    WHEN p_referral_index <= 0 THEN 1
    WHEN p_referral_index = 1 THEN 1
    WHEN p_referral_index = 2 THEN 2
    ELSE 3
  END;
$function$;

CREATE OR REPLACE FUNCTION public.get_next_boost_reward(p_merchant_customer_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_count integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('successful_referrals', 0, 'next_boost', 1, 'is_streak_complete', false, 'is_new_cycle', false);
  END IF;

  SELECT COALESCE(successful_referrals, 0) INTO v_count
  FROM loyalty_accounts
  WHERE user_id = v_user_id AND merchant_customer_id = p_merchant_customer_id;

  v_count := COALESCE(v_count, 0);

  RETURN json_build_object(
    'successful_referrals', v_count,
    'next_boost', public.calc_boost_reward(v_count + 1),
    'is_streak_complete', public.calc_boost_reward(v_count + 1) = 3,
    'is_new_cycle', false
  );
END;
$function$;