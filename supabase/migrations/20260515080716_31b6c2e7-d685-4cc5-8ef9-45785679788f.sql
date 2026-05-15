CREATE OR REPLACE FUNCTION public.award_google_review_bonus(p_merchant_customer_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_loyalty_account RECORD;
  v_existing RECORD;
  v_new_balance integer;
  v_merchant_active boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Nicht authentifiziert');
  END IF;

  SELECT active INTO v_merchant_active FROM customers WHERE id = p_merchant_customer_id;
  IF NOT FOUND OR v_merchant_active IS NOT TRUE THEN
    RETURN json_build_object('success', false, 'error', 'Geschäft nicht verfügbar');
  END IF;

  SELECT * INTO v_loyalty_account
  FROM loyalty_accounts
  WHERE user_id = v_user_id AND merchant_customer_id = p_merchant_customer_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Du musst zuerst mindestens einmal in diesem Geschäft eingecheckt haben.',
      'error_code', 'no_loyalty_account'
    );
  END IF;

  SELECT * INTO v_existing FROM point_transactions
  WHERE loyalty_account_id = v_loyalty_account.id
    AND transaction_type = 'google_review_bonus'
  LIMIT 1;

  IF FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Bonus für diese Bewertung wurde bereits eingelöst',
      'error_code', 'already_redeemed'
    );
  END IF;

  -- Bewertung zählt als dauerhafter Check-in (kein Punkt mehr).
  v_new_balance := v_loyalty_account.current_points_balance;

  INSERT INTO point_transactions (loyalty_account_id, merchant_customer_id, points_change, transaction_type, description)
  VALUES (v_loyalty_account.id, p_merchant_customer_id, 0, 'google_review_bonus', 'Check-in für Google-Bewertung');

  INSERT INTO point_transactions (loyalty_account_id, merchant_customer_id, points_change, transaction_type, description)
  VALUES (v_loyalty_account.id, p_merchant_customer_id, 0, 'check_in', 'Check-in: Google-Bewertung');

  RETURN json_build_object(
    'success', true,
    'points_awarded', 0,
    'total_points', v_new_balance,
    'check_in_added', true
  );
END;
$function$;

-- Bestehenden Bewertungs-Bonus für die betroffene User-Loyalty als Check-in nachtragen,
-- falls noch nicht vorhanden, und alten Punkt vom Saldo abziehen.
DO $$
DECLARE
  v_la RECORD;
BEGIN
  FOR v_la IN
    SELECT DISTINCT la.id AS loyalty_account_id, la.merchant_customer_id, la.current_points_balance
    FROM loyalty_accounts la
    JOIN point_transactions pt ON pt.loyalty_account_id = la.id
    WHERE pt.transaction_type = 'google_review_bonus'
      AND pt.points_change > 0
  LOOP
    -- Punkt rückgängig machen (von Saldo abziehen)
    UPDATE loyalty_accounts
    SET current_points_balance = GREATEST(current_points_balance - 1, 0),
        updated_at = now()
    WHERE id = v_la.loyalty_account_id;

    -- Alte Punkt-Transaktion auf 0 setzen
    UPDATE point_transactions
    SET points_change = 0,
        description = 'Check-in für Google-Bewertung'
    WHERE loyalty_account_id = v_la.loyalty_account_id
      AND transaction_type = 'google_review_bonus';

    -- Check-in-Eintrag ergänzen, falls nicht vorhanden
    IF NOT EXISTS (
      SELECT 1 FROM point_transactions
      WHERE loyalty_account_id = v_la.loyalty_account_id
        AND transaction_type = 'check_in'
        AND description = 'Check-in: Google-Bewertung'
    ) THEN
      INSERT INTO point_transactions (loyalty_account_id, merchant_customer_id, points_change, transaction_type, description)
      VALUES (v_la.loyalty_account_id, v_la.merchant_customer_id, 0, 'check_in', 'Check-in: Google-Bewertung');
    END IF;
  END LOOP;
END $$;