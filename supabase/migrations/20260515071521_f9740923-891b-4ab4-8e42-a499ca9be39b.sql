-- 1. Schema additions
ALTER TABLE public.loyalty_accounts
  ADD COLUMN IF NOT EXISTS successful_referrals integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.boost_processing_state (
  user_id uuid PRIMARY KEY,
  boosts_today integer NOT NULL DEFAULT 0,
  last_processed_date date NOT NULL DEFAULT current_date,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.boost_processing_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own boost state"
  ON public.boost_processing_state FOR SELECT
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.pending_boosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  merchant_customer_id uuid NOT NULL,
  boost_count integer NOT NULL,
  referral_index integer NOT NULL,
  invitee_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_pending_boosts_user_unprocessed
  ON public.pending_boosts (user_id, created_at)
  WHERE processed_at IS NULL;

ALTER TABLE public.pending_boosts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pending boosts"
  ON public.pending_boosts FOR SELECT
  USING (auth.uid() = user_id);

-- 2. Helper: Calculate next boost reward (1, 2 or 3) given a referral count
CREATE OR REPLACE FUNCTION public.calc_boost_reward(p_referral_index integer)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE WHEN (p_referral_index % 3) = 0 THEN 3 ELSE (p_referral_index % 3) END;
$$;

-- 3. Public: get next boost reward preview for UI
CREATE OR REPLACE FUNCTION public.get_next_boost_reward(p_merchant_customer_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_count integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('successful_referrals', 0, 'next_boost', 1, 'is_streak_complete', false);
  END IF;

  SELECT COALESCE(successful_referrals, 0) INTO v_count
  FROM loyalty_accounts
  WHERE user_id = v_user_id AND merchant_customer_id = p_merchant_customer_id;

  v_count := COALESCE(v_count, 0);

  RETURN json_build_object(
    'successful_referrals', v_count,
    'next_boost', public.calc_boost_reward(v_count + 1),
    'is_streak_complete', public.calc_boost_reward(v_count + 1) = 3,
    'is_new_cycle', (v_count > 0 AND ((v_count + 1) % 3) = 1)
  );
END;
$$;

-- 4. Rewrite process_referral_bonus with escalation + daily cap
CREATE OR REPLACE FUNCTION public.process_referral_bonus(p_user_id uuid, p_merchant_customer_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_red RECORD;
  v_inviter_account RECORD;
  v_invitee_account RECORD;
  v_now timestamptz := now();
  v_today date := current_date;
  v_same_device boolean := false;
  v_referral_index integer;
  v_boosts_due integer;
  v_state RECORD;
  v_boosts_today integer := 0;
  v_boosts_to_grant integer;
  v_boosts_pending integer;
  v_invitee_points integer;
  v_new_inviter_balance integer;
  v_new_invitee_balance integer;
BEGIN
  -- Find the open redemption (locked)
  SELECT r.*, i.inviter_user_id, i.id AS inv_id
  INTO v_red
  FROM invitation_redemptions r
  JOIN invitations i ON i.id = r.invitation_id
  WHERE r.invitee_user_id = p_user_id
    AND i.merchant_customer_id = p_merchant_customer_id
    AND r.bonus_awarded_at IS NULL
    AND r.bonus_window_starts_at > (v_now - interval '90 days')
  ORDER BY r.accepted_at DESC
  LIMIT 1
  FOR UPDATE OF r SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN json_build_object('processed', false);
  END IF;

  -- Mark redemption as awarded immediately to prevent double processing
  UPDATE invitation_redemptions SET bonus_awarded_at = v_now WHERE id = v_red.id;

  -- Anti-fraud: same device check
  SELECT EXISTS (
    SELECT 1
    FROM user_device_fingerprints a
    JOIN user_device_fingerprints b ON a.fingerprint = b.fingerprint
    WHERE a.user_id = v_red.inviter_user_id AND b.user_id = p_user_id
  ) INTO v_same_device;

  IF v_same_device THEN
    UPDATE invitations SET status = 'blocked_same_device' WHERE id = v_red.inv_id;
    RETURN json_build_object('processed', true, 'bonus_awarded', false, 'reason', 'same_device');
  END IF;

  -- Lock inviter loyalty account, increment referral counter
  SELECT * INTO v_inviter_account
  FROM loyalty_accounts
  WHERE user_id = v_red.inviter_user_id AND merchant_customer_id = p_merchant_customer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO loyalty_accounts (user_id, merchant_customer_id, current_points_balance, successful_referrals)
    VALUES (v_red.inviter_user_id, p_merchant_customer_id, 0, 1)
    RETURNING * INTO v_inviter_account;
    v_referral_index := 1;
  ELSE
    UPDATE loyalty_accounts
    SET successful_referrals = COALESCE(successful_referrals, 0) + 1, updated_at = v_now
    WHERE id = v_inviter_account.id
    RETURNING successful_referrals INTO v_referral_index;
  END IF;

  v_boosts_due := public.calc_boost_reward(v_referral_index);

  -- Daily cap state for inviter
  SELECT * INTO v_state
  FROM boost_processing_state
  WHERE user_id = v_red.inviter_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO boost_processing_state (user_id, boosts_today, last_processed_date)
    VALUES (v_red.inviter_user_id, 0, v_today)
    RETURNING * INTO v_state;
  END IF;

  IF v_state.last_processed_date < v_today THEN
    UPDATE boost_processing_state
    SET boosts_today = 0, last_processed_date = v_today, updated_at = v_now
    WHERE user_id = v_red.inviter_user_id;
    v_boosts_today := 0;
  ELSE
    v_boosts_today := v_state.boosts_today;
  END IF;

  v_boosts_to_grant := GREATEST(0, LEAST(v_boosts_due, 5 - v_boosts_today));
  v_boosts_pending := v_boosts_due - v_boosts_to_grant;

  -- Grant boost check-ins (as points to current balance)
  IF v_boosts_to_grant > 0 THEN
    UPDATE loyalty_accounts
    SET current_points_balance = current_points_balance + v_boosts_to_grant, updated_at = v_now
    WHERE id = v_inviter_account.id
    RETURNING current_points_balance INTO v_new_inviter_balance;

    INSERT INTO point_transactions (loyalty_account_id, merchant_customer_id, points_change, transaction_type, description)
    VALUES (
      v_inviter_account.id,
      p_merchant_customer_id,
      v_boosts_to_grant,
      'referral_bonus',
      'Empfehlungs-Boost: +' || v_boosts_to_grant || ' Check-in' || CASE WHEN v_boosts_to_grant > 1 THEN 's' ELSE '' END
    );

    UPDATE boost_processing_state
    SET boosts_today = boosts_today + v_boosts_to_grant, updated_at = v_now
    WHERE user_id = v_red.inviter_user_id;
  END IF;

  -- Queue overflow
  IF v_boosts_pending > 0 THEN
    INSERT INTO pending_boosts (user_id, merchant_customer_id, boost_count, referral_index, invitee_user_id)
    VALUES (v_red.inviter_user_id, p_merchant_customer_id, v_boosts_pending, v_referral_index, p_user_id);
  END IF;

  -- Invitee bonus (Punkte ×2 logic remains)
  SELECT COALESCE(pt.points_change, 0) INTO v_invitee_points
  FROM point_transactions pt
  JOIN loyalty_accounts la ON la.id = pt.loyalty_account_id
  WHERE la.user_id = p_user_id
    AND la.merchant_customer_id = p_merchant_customer_id
    AND pt.transaction_type IN ('nfc_stamp', 'nfc_scan')
  ORDER BY pt.created_at DESC
  LIMIT 1;

  v_invitee_points := COALESCE(v_invitee_points, 0);

  SELECT * INTO v_invitee_account FROM loyalty_accounts
  WHERE user_id = p_user_id AND merchant_customer_id = p_merchant_customer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO loyalty_accounts (user_id, merchant_customer_id, current_points_balance)
    VALUES (p_user_id, p_merchant_customer_id, v_invitee_points)
    RETURNING * INTO v_invitee_account;
    v_new_invitee_balance := v_invitee_points;
  ELSIF v_invitee_points > 0 THEN
    UPDATE loyalty_accounts
    SET current_points_balance = current_points_balance + v_invitee_points, updated_at = v_now
    WHERE id = v_invitee_account.id
    RETURNING current_points_balance INTO v_new_invitee_balance;

    INSERT INTO point_transactions (loyalty_account_id, merchant_customer_id, points_change, transaction_type, description)
    VALUES (v_invitee_account.id, p_merchant_customer_id, v_invitee_points, 'referral_bonus', 'Empfehlungs-Bonus (Eingeladener)');
  ELSE
    v_new_invitee_balance := v_invitee_account.current_points_balance;
  END IF;

  UPDATE invitations SET status = 'converted' WHERE id = v_red.inv_id;

  RETURN json_build_object(
    'processed', true,
    'bonus_awarded', true,
    'inviter_user_id', v_red.inviter_user_id,
    'invitee_user_id', p_user_id,
    'merchant_customer_id', p_merchant_customer_id,
    'referral_index', v_referral_index,
    'boosts_due', v_boosts_due,
    'boosts_granted', v_boosts_to_grant,
    'boosts_pending', v_boosts_pending,
    'inviter_points', v_boosts_to_grant,
    'invitee_points', v_invitee_points
  );
END;
$$;

-- 5. Drain queue next day (callable by user themselves)
CREATE OR REPLACE FUNCTION public.process_pending_boosts()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_today date := current_date;
  v_now timestamptz := now();
  v_state RECORD;
  v_boosts_today integer := 0;
  v_remaining integer;
  v_pending RECORD;
  v_grant integer;
  v_total_granted integer := 0;
  v_account RECORD;
  v_results jsonb := '[]'::jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'unauthorized');
  END IF;

  SELECT * INTO v_state FROM boost_processing_state WHERE user_id = v_user_id FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO boost_processing_state (user_id, boosts_today, last_processed_date)
    VALUES (v_user_id, 0, v_today)
    RETURNING * INTO v_state;
  END IF;

  IF v_state.last_processed_date < v_today THEN
    UPDATE boost_processing_state
    SET boosts_today = 0, last_processed_date = v_today, updated_at = v_now
    WHERE user_id = v_user_id;
    v_boosts_today := 0;
  ELSE
    v_boosts_today := v_state.boosts_today;
  END IF;

  v_remaining := 5 - v_boosts_today;
  IF v_remaining <= 0 THEN
    RETURN json_build_object('success', true, 'granted_total', 0, 'remaining_today', 0);
  END IF;

  FOR v_pending IN
    SELECT * FROM pending_boosts
    WHERE user_id = v_user_id AND processed_at IS NULL
    ORDER BY created_at ASC
    FOR UPDATE SKIP LOCKED
  LOOP
    EXIT WHEN v_remaining <= 0;
    v_grant := LEAST(v_pending.boost_count, v_remaining);

    SELECT * INTO v_account FROM loyalty_accounts
    WHERE user_id = v_user_id AND merchant_customer_id = v_pending.merchant_customer_id
    FOR UPDATE;

    IF NOT FOUND THEN
      INSERT INTO loyalty_accounts (user_id, merchant_customer_id, current_points_balance)
      VALUES (v_user_id, v_pending.merchant_customer_id, v_grant)
      RETURNING * INTO v_account;
    ELSE
      UPDATE loyalty_accounts
      SET current_points_balance = current_points_balance + v_grant, updated_at = v_now
      WHERE id = v_account.id;
    END IF;

    INSERT INTO point_transactions (loyalty_account_id, merchant_customer_id, points_change, transaction_type, description)
    VALUES (
      v_account.id,
      v_pending.merchant_customer_id,
      v_grant,
      'referral_bonus',
      'Empfehlungs-Boost (verzögert): +' || v_grant || ' Check-in' || CASE WHEN v_grant > 1 THEN 's' ELSE '' END
    );

    IF v_grant >= v_pending.boost_count THEN
      UPDATE pending_boosts SET processed_at = v_now WHERE id = v_pending.id;
    ELSE
      UPDATE pending_boosts SET boost_count = boost_count - v_grant WHERE id = v_pending.id;
    END IF;

    v_remaining := v_remaining - v_grant;
    v_total_granted := v_total_granted + v_grant;
    v_results := v_results || jsonb_build_object(
      'merchant_customer_id', v_pending.merchant_customer_id,
      'granted', v_grant
    );
  END LOOP;

  IF v_total_granted > 0 THEN
    UPDATE boost_processing_state
    SET boosts_today = boosts_today + v_total_granted, updated_at = v_now
    WHERE user_id = v_user_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'granted_total', v_total_granted,
    'remaining_today', GREATEST(0, v_remaining),
    'details', v_results
  );
END;
$$;