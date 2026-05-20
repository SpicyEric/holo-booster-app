-- Fix: register_box_nfc_chip (mit p_allow_duplicate) hat neu eingefügte Chips
-- mit merchant_customer_id = NULL erstellt. Dadurch wurden Zusatzkarten zwar
-- gespeichert, aber der Scan-RPC fand sie nicht (JOIN auf customers schlägt fehl
-- → "NFC-Chip nicht registriert"). Lösung: beim Insert die Händler-Zuordnung
-- direkt aus customer_boxes ableiten.

CREATE OR REPLACE FUNCTION public.register_box_nfc_chip(
  p_chip_uid text,
  p_stamp_color text,
  p_stamp_name text,
  p_hardware_uid text,
  p_points_value integer DEFAULT 1,
  p_allow_duplicate boolean DEFAULT false
)
RETURNS TABLE(id uuid, chip_uid text, stamp_color text, hardware_uid text, merchant_customer_id uuid, points_value integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_chip_uid text := upper(trim(p_chip_uid));
  v_stamp_color text := trim(p_stamp_color);
  v_hardware_uid text := nullif(lower(trim(p_hardware_uid)), '');
  v_existing_id uuid;
  v_existing_merchant_id uuid;
  v_box_id uuid;
  v_assigned_merchant_id uuid;
BEGIN
  IF v_caller IS NULL OR NOT public.has_role(v_caller, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Nur Admins können Karten für Boxen registrieren';
  END IF;

  IF v_chip_uid IS NULL OR v_chip_uid = '' OR v_stamp_color IS NULL OR v_stamp_color = '' THEN
    RAISE EXCEPTION 'Karte-ID und Farbe sind erforderlich';
  END IF;

  -- Optional: bereits zugewiesener Händler für diese Stempel-/Box-ID ermitteln
  SELECT b.id INTO v_box_id
  FROM public.boxes b
  WHERE upper(b.stamp_id) = v_chip_uid
  LIMIT 1;

  IF v_box_id IS NOT NULL THEN
    SELECT cb.customer_id INTO v_assigned_merchant_id
    FROM public.customer_boxes cb
    WHERE cb.box_id = v_box_id
    LIMIT 1;
  END IF;

  IF v_hardware_uid IS NOT NULL THEN
    SELECT nc.id, nc.merchant_customer_id INTO v_existing_id, v_existing_merchant_id
    FROM public.nfc_chips nc
    WHERE lower(nc.hardware_uid) = v_hardware_uid
    ORDER BY nc.created_at DESC LIMIT 1;
  END IF;

  IF v_existing_id IS NULL AND NOT COALESCE(p_allow_duplicate, false) THEN
    SELECT nc.id, nc.merchant_customer_id INTO v_existing_id, v_existing_merchant_id
    FROM public.nfc_chips nc
    WHERE upper(nc.chip_uid) = v_chip_uid AND lower(nc.stamp_color) = lower(v_stamp_color)
    ORDER BY nc.created_at DESC LIMIT 1;
  END IF;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.nfc_chips nc
    SET chip_uid = v_chip_uid,
        stamp_color = v_stamp_color,
        stamp_name = COALESCE(nullif(trim(p_stamp_name), ''), initcap(v_stamp_color)),
        hardware_uid = v_hardware_uid,
        points_value = COALESCE(p_points_value, nc.points_value, 1),
        is_active = true,
        merchant_customer_id = COALESCE(v_existing_merchant_id, v_assigned_merchant_id)
    WHERE nc.id = v_existing_id;
  ELSE
    INSERT INTO public.nfc_chips (chip_uid, stamp_color, stamp_name, hardware_uid, points_value, is_active, merchant_customer_id)
    VALUES (v_chip_uid, v_stamp_color,
      COALESCE(nullif(trim(p_stamp_name), ''), initcap(v_stamp_color)),
      v_hardware_uid, COALESCE(p_points_value, 1), true, v_assigned_merchant_id)
    RETURNING nfc_chips.id INTO v_existing_id;
  END IF;

  RETURN QUERY
  SELECT nc.id, nc.chip_uid, nc.stamp_color, nc.hardware_uid, nc.merchant_customer_id, COALESCE(nc.points_value, 1)
  FROM public.nfc_chips nc WHERE nc.id = v_existing_id;
END;
$function$;

-- Backfill: bestehende verwaiste Chips, deren Stempel-ID einem Händler zugeordnet ist,
-- nachträglich verknüpfen.
UPDATE public.nfc_chips nc
SET merchant_customer_id = cb.customer_id
FROM public.boxes b
JOIN public.customer_boxes cb ON cb.box_id = b.id
WHERE nc.merchant_customer_id IS NULL
  AND upper(nc.chip_uid) = upper(b.stamp_id);
