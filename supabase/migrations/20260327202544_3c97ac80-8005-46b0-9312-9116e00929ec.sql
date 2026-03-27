
CREATE OR REPLACE FUNCTION public.award_points_via_nfc(p_chip_data text, p_hardware_uid text, p_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  -- Backward-compatible overload: ignore p_chip_data, delegate to the 2-param version
  RETURN public.award_points_via_nfc(p_hardware_uid, p_user_id);
END;
$$;
