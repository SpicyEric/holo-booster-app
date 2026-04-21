-- SECURITY DEFINER function so merchants can claim orphan NFC chips
-- that match a stamp_id they have just assigned to themselves.
CREATE OR REPLACE FUNCTION public.claim_orphan_nfc_chips(
  p_stempel_id text,
  p_merchant_customer_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_is_admin boolean;
  v_owns_merchant boolean;
  v_updated integer := 0;
BEGIN
  IF p_stempel_id IS NULL OR trim(p_stempel_id) = '' OR p_merchant_customer_id IS NULL THEN
    RETURN 0;
  END IF;

  -- Caller must be admin OR own/be assigned to this merchant
  v_is_admin := has_role(v_caller, 'admin'::app_role);

  SELECT EXISTS (
    SELECT 1 FROM customer_users
    WHERE customer_id = p_merchant_customer_id AND user_id = v_caller
  ) OR EXISTS (
    SELECT 1 FROM merchant_assignments
    WHERE customer_id = p_merchant_customer_id AND merchant_user_id = v_caller
  ) INTO v_owns_merchant;

  IF NOT (v_is_admin OR v_owns_merchant) THEN
    RAISE EXCEPTION 'Not authorized to claim chips for this merchant';
  END IF;

  UPDATE nfc_chips
  SET merchant_customer_id = p_merchant_customer_id
  WHERE upper(chip_uid) = upper(trim(p_stempel_id))
    AND merchant_customer_id IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_orphan_nfc_chips(text, uuid) TO authenticated;

-- Fix the existing orphan chips for the "test" merchant right now
UPDATE nfc_chips
SET merchant_customer_id = 'bb96bed9-848b-49d0-8ec3-1ebb4bc9e217'
WHERE chip_uid = 'XVUXJ-NPY8S-1F2GR'
  AND merchant_customer_id IS NULL;

-- Also link the eloyo_box to that merchant for consistency
UPDATE eloyo_boxes
SET haendler_id = 'bb96bed9-848b-49d0-8ec3-1ebb4bc9e217',
    abschlussdatum = COALESCE(abschlussdatum, now())
WHERE box_id = 'GYFW6' AND haendler_id IS NULL;