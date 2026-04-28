-- Härtung: consume_invitation blockt Annahme, wenn auf demselben Gerät
-- bereits ein Bonus für DIESEN Merchant ausgezahlt wurde (von egal welchem Account).
CREATE OR REPLACE FUNCTION public.consume_invitation(p_share_code text, p_device_fingerprint text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_inv RECORD;
  v_existing_for_merchant RECORD;
  v_already_has_points boolean;
  v_device_already_redeemed boolean := false;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Nicht authentifiziert');
  END IF;

  SELECT * INTO v_inv FROM invitations WHERE share_code = p_share_code;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Einladung nicht gefunden');
  END IF;

  IF v_inv.expires_at < now() THEN
    RETURN json_build_object('success', false, 'error', 'Einladung abgelaufen');
  END IF;

  IF v_inv.inviter_user_id = v_user_id THEN
    RETURN json_build_object('success', false, 'error', 'Du kannst dich nicht selbst einladen');
  END IF;

  -- Hat dieser User bei DIESEM Laden schon einmal Punkte gesammelt?
  SELECT EXISTS (
    SELECT 1 FROM loyalty_accounts la
    WHERE la.user_id = v_user_id
      AND la.merchant_customer_id = v_inv.merchant_customer_id
      AND EXISTS (
        SELECT 1 FROM point_transactions pt
        WHERE pt.loyalty_account_id = la.id AND pt.points_change > 0
      )
  ) INTO v_already_has_points;

  IF v_already_has_points THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Du sammelst bereits Punkte bei diesem Geschäft',
      'error_code', 'already_customer'
    );
  END IF;

  -- Hat dieser User bereits eine offene Einladung für DIESEN Laden?
  SELECT r.* INTO v_existing_for_merchant
  FROM invitation_redemptions r
  JOIN invitations i ON i.id = r.invitation_id
  WHERE r.invitee_user_id = v_user_id
    AND i.merchant_customer_id = v_inv.merchant_customer_id
    AND r.bonus_awarded_at IS NULL
    AND r.bonus_window_starts_at > (now() - interval '7 days')
  LIMIT 1;

  IF FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Du hast bereits eine offene Einladung für dieses Geschäft',
      'error_code', 'already_pending'
    );
  END IF;

  -- Geräte-Fingerprint speichern und prüfen
  IF p_device_fingerprint IS NOT NULL AND trim(p_device_fingerprint) <> '' THEN
    INSERT INTO user_device_fingerprints (user_id, fingerprint, last_seen_at)
    VALUES (v_user_id, p_device_fingerprint, now())
    ON CONFLICT (user_id, fingerprint) DO UPDATE SET last_seen_at = now();

    -- NEU: Wurde auf diesem Gerät schon einmal eine Einladung für DIESEN Merchant
    -- erfolgreich eingelöst (Bonus ausgezahlt)? Dann blockieren.
    SELECT EXISTS (
      SELECT 1
      FROM user_device_fingerprints fp
      JOIN invitation_redemptions r ON r.invitee_user_id = fp.user_id
      JOIN invitations i ON i.id = r.invitation_id
      WHERE fp.fingerprint = p_device_fingerprint
        AND i.merchant_customer_id = v_inv.merchant_customer_id
        AND r.bonus_awarded_at IS NOT NULL
    ) INTO v_device_already_redeemed;

    IF v_device_already_redeemed THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Auf diesem Gerät wurde bereits eine Einladung für dieses Geschäft eingelöst.',
        'error_code', 'device_already_redeemed_for_merchant'
      );
    END IF;
  END IF;

  -- Redemption anlegen
  INSERT INTO invitation_redemptions (invitation_id, invitee_user_id, bonus_window_starts_at)
  VALUES (v_inv.id, v_user_id, now());

  UPDATE invitations SET status = 'accepted' WHERE id = v_inv.id AND status = 'pending';

  RETURN json_build_object(
    'success', true,
    'invitation_id', v_inv.id,
    'merchant_customer_id', v_inv.merchant_customer_id,
    'window_ends_at', now() + interval '7 days'
  );
END;
$function$;