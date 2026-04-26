
-- ============================================================
-- 1. CUSTOMERS: Referral-Settings (pro Händler konfigurierbar)
-- ============================================================
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS referral_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS referral_inviter_points integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS referral_invitee_points integer NOT NULL DEFAULT 1;

-- ============================================================
-- 2. INVITATIONS Tabelle
-- ============================================================
CREATE TABLE IF NOT EXISTS public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  share_code text NOT NULL UNIQUE,
  inviter_user_id uuid NOT NULL,
  merchant_customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','converted','expired'))
);

CREATE INDEX IF NOT EXISTS idx_invitations_share_code ON public.invitations(share_code);
CREATE INDEX IF NOT EXISTS idx_invitations_inviter ON public.invitations(inviter_user_id);
CREATE INDEX IF NOT EXISTS idx_invitations_merchant ON public.invitations(merchant_customer_id);

-- ============================================================
-- 3. INVITATION_REDEMPTIONS Tabelle
-- ============================================================
CREATE TABLE IF NOT EXISTS public.invitation_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id uuid NOT NULL REFERENCES public.invitations(id) ON DELETE CASCADE,
  invitee_user_id uuid NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  invitee_stamped_at timestamptz,
  inviter_stamped_at timestamptz,
  bonus_awarded_at timestamptz,
  bonus_window_starts_at timestamptz,
  UNIQUE (invitation_id, invitee_user_id),
  UNIQUE (invitee_user_id) -- Ein User kann nur EINMAL global eingeladen werden (Anti-Missbrauch)
);

CREATE INDEX IF NOT EXISTS idx_redemptions_invitation ON public.invitation_redemptions(invitation_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_invitee ON public.invitation_redemptions(invitee_user_id);

-- ============================================================
-- 4. RLS aktivieren
-- ============================================================
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitation_redemptions ENABLE ROW LEVEL SECURITY;

-- INVITATIONS Policies
CREATE POLICY "Users can create their own invitations"
  ON public.invitations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = inviter_user_id);

CREATE POLICY "Users can view their own invitations"
  ON public.invitations FOR SELECT
  TO authenticated
  USING (auth.uid() = inviter_user_id);

CREATE POLICY "Anyone can lookup invitation by code (for preview)"
  ON public.invitations FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Merchants can view invitations to their stores"
  ON public.invitations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.customer_users cu
      WHERE cu.customer_id = merchant_customer_id AND cu.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.merchant_assignments ma
      WHERE ma.customer_id = merchant_customer_id AND ma.merchant_user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- REDEMPTIONS Policies
CREATE POLICY "Invitees can view their own redemption"
  ON public.invitation_redemptions FOR SELECT
  TO authenticated
  USING (auth.uid() = invitee_user_id);

CREATE POLICY "Inviters can view redemptions of their invitations"
  ON public.invitation_redemptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invitations i
      WHERE i.id = invitation_id AND i.inviter_user_id = auth.uid()
    )
  );

CREATE POLICY "Merchants can view redemptions for their stores"
  ON public.invitation_redemptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invitations i
      JOIN public.customers c ON c.id = i.merchant_customer_id
      WHERE i.id = invitation_id
        AND (
          EXISTS (SELECT 1 FROM customer_users cu WHERE cu.customer_id = c.id AND cu.user_id = auth.uid())
          OR EXISTS (SELECT 1 FROM merchant_assignments ma WHERE ma.customer_id = c.id AND ma.merchant_user_id = auth.uid())
          OR has_role(auth.uid(), 'admin'::app_role)
        )
    )
  );

-- ============================================================
-- 5. RPC: create_invitation
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_invitation(p_merchant_customer_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_code text;
  v_attempts int := 0;
  v_invitation_id uuid;
  v_merchant_active boolean;
  v_referral_enabled boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Nicht authentifiziert');
  END IF;

  SELECT active, referral_enabled INTO v_merchant_active, v_referral_enabled
  FROM customers WHERE id = p_merchant_customer_id;

  IF NOT FOUND OR v_merchant_active IS NOT TRUE THEN
    RETURN json_build_object('success', false, 'error', 'Geschäft nicht verfügbar');
  END IF;

  IF v_referral_enabled IS NOT TRUE THEN
    RETURN json_build_object('success', false, 'error', 'Empfehlungen sind für dieses Geschäft deaktiviert');
  END IF;

  -- Erzeuge eindeutigen 8-Zeichen Code (verwechselungssicher: keine 0,O,I,l,1)
  LOOP
    v_attempts := v_attempts + 1;
    v_code := substring(translate(encode(gen_random_bytes(8),'base64'),'+/=Ol01I','ABCDEFGH'),1,8);
    BEGIN
      INSERT INTO invitations (share_code, inviter_user_id, merchant_customer_id)
      VALUES (v_code, v_user_id, p_merchant_customer_id)
      RETURNING id INTO v_invitation_id;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF v_attempts > 5 THEN
        RETURN json_build_object('success', false, 'error', 'Code-Generierung fehlgeschlagen');
      END IF;
    END;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'invitation_id', v_invitation_id,
    'share_code', v_code,
    'expires_at', now() + interval '7 days'
  );
END;
$$;

-- ============================================================
-- 6. RPC: lookup_invitation (anonymer Lookup für Preview)
-- ============================================================
CREATE OR REPLACE FUNCTION public.lookup_invitation(p_share_code text)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv RECORD;
  v_merchant RECORD;
BEGIN
  SELECT i.*, c.name, c.company_name, c.logo_url, c.cover_image_url, c.referral_invitee_points
  INTO v_inv
  FROM invitations i
  JOIN customers c ON c.id = i.merchant_customer_id
  WHERE i.share_code = p_share_code;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Einladung nicht gefunden');
  END IF;

  IF v_inv.expires_at < now() THEN
    RETURN json_build_object('success', false, 'error', 'Einladung abgelaufen');
  END IF;

  RETURN json_build_object(
    'success', true,
    'invitation_id', v_inv.id,
    'merchant_customer_id', v_inv.merchant_customer_id,
    'merchant_name', COALESCE(v_inv.company_name, v_inv.name),
    'logo_url', v_inv.logo_url,
    'cover_image_url', v_inv.cover_image_url,
    'invitee_points', v_inv.referral_invitee_points,
    'expires_at', v_inv.expires_at
  );
END;
$$;

-- ============================================================
-- 7. RPC: consume_invitation (nach App-Open / Login)
-- ============================================================
CREATE OR REPLACE FUNCTION public.consume_invitation(p_share_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_inv RECORD;
  v_existing RECORD;
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

  -- Anti-Self-Invite
  IF v_inv.inviter_user_id = v_user_id THEN
    RETURN json_build_object('success', false, 'error', 'Du kannst dich nicht selbst einladen');
  END IF;

  -- Hat dieser User bereits eine Einladung global eingelöst?
  SELECT * INTO v_existing FROM invitation_redemptions WHERE invitee_user_id = v_user_id;

  IF FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Du hast bereits eine Einladung angenommen',
      'error_code', 'already_redeemed'
    );
  END IF;

  -- Redemption anlegen mit 24h Bonus-Fenster ab jetzt
  INSERT INTO invitation_redemptions (invitation_id, invitee_user_id, bonus_window_starts_at)
  VALUES (v_inv.id, v_user_id, now());

  RETURN json_build_object(
    'success', true,
    'invitation_id', v_inv.id,
    'merchant_customer_id', v_inv.merchant_customer_id
  );
END;
$$;

-- ============================================================
-- 8. RPC: get_pending_invitation (nach Login holen)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_pending_invitation()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_red RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false);
  END IF;

  SELECT 
    r.id as redemption_id,
    r.invitee_stamped_at,
    r.bonus_window_starts_at,
    r.bonus_awarded_at,
    i.id as invitation_id,
    i.merchant_customer_id,
    c.name,
    c.company_name,
    c.logo_url,
    c.cover_image_url,
    c.referral_invitee_points
  INTO v_red
  FROM invitation_redemptions r
  JOIN invitations i ON i.id = r.invitation_id
  JOIN customers c ON c.id = i.merchant_customer_id
  WHERE r.invitee_user_id = v_user_id
    AND r.bonus_awarded_at IS NULL
    AND r.bonus_window_starts_at > (now() - interval '24 hours')
  ORDER BY r.accepted_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false);
  END IF;

  RETURN json_build_object(
    'success', true,
    'redemption_id', v_red.redemption_id,
    'merchant_customer_id', v_red.merchant_customer_id,
    'merchant_name', COALESCE(v_red.company_name, v_red.name),
    'logo_url', v_red.logo_url,
    'cover_image_url', v_red.cover_image_url,
    'invitee_points', v_red.referral_invitee_points,
    'invitee_stamped', v_red.invitee_stamped_at IS NOT NULL,
    'window_ends_at', v_red.bonus_window_starts_at + interval '24 hours'
  );
END;
$$;

-- ============================================================
-- 9. process_referral_bonus: nach jedem Stempel aufrufen
-- ============================================================
CREATE OR REPLACE FUNCTION public.process_referral_bonus(
  p_user_id uuid,
  p_merchant_customer_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_red RECORD;
  v_inv RECORD;
  v_inviter_points integer;
  v_invitee_points integer;
  v_inviter_account RECORD;
  v_invitee_account RECORD;
  v_now timestamptz := now();
  v_window_end timestamptz;
BEGIN
  -- Ist der User als INVITEE registriert? (innerhalb 24h Fenster, gleicher Laden)
  SELECT r.*, i.inviter_user_id, i.merchant_customer_id as inv_merchant
  INTO v_red
  FROM invitation_redemptions r
  JOIN invitations i ON i.id = r.invitation_id
  WHERE r.invitee_user_id = p_user_id
    AND i.merchant_customer_id = p_merchant_customer_id
    AND r.bonus_awarded_at IS NULL
    AND r.bonus_window_starts_at > (v_now - interval '24 hours');

  IF FOUND THEN
    -- Markiere Invitee-Stempel
    IF v_red.invitee_stamped_at IS NULL THEN
      UPDATE invitation_redemptions
      SET invitee_stamped_at = v_now
      WHERE id = v_red.id;
      v_red.invitee_stamped_at := v_now;
    END IF;
  ELSE
    -- Vielleicht ist DIESER User ein INVITER, dessen Invitee gerade kam?
    -- Suche aktive Redemption, in deren Inviter dieser User ist und Invitee bereits stempelte
    SELECT r.*, i.inviter_user_id, i.merchant_customer_id as inv_merchant
    INTO v_red
    FROM invitation_redemptions r
    JOIN invitations i ON i.id = r.invitation_id
    WHERE i.inviter_user_id = p_user_id
      AND i.merchant_customer_id = p_merchant_customer_id
      AND r.bonus_awarded_at IS NULL
      AND r.invitee_stamped_at IS NOT NULL
      AND r.bonus_window_starts_at > (v_now - interval '24 hours')
    ORDER BY r.invitee_stamped_at DESC
    LIMIT 1;

    IF FOUND THEN
      -- Markiere Inviter-Stempel
      IF v_red.inviter_stamped_at IS NULL THEN
        UPDATE invitation_redemptions
        SET inviter_stamped_at = v_now
        WHERE id = v_red.id;
        v_red.inviter_stamped_at := v_now;
      END IF;
    END IF;
  END IF;

  IF NOT FOUND THEN
    RETURN json_build_object('processed', false);
  END IF;

  -- Wenn beide gestempelt haben → Bonus auszahlen
  IF v_red.invitee_stamped_at IS NOT NULL AND v_red.inviter_stamped_at IS NOT NULL THEN
    SELECT referral_inviter_points, referral_invitee_points
    INTO v_inviter_points, v_invitee_points
    FROM customers WHERE id = p_merchant_customer_id;

    -- Inviter Bonus
    SELECT * INTO v_inviter_account FROM loyalty_accounts
    WHERE user_id = v_red.inviter_user_id AND merchant_customer_id = p_merchant_customer_id;

    IF NOT FOUND THEN
      INSERT INTO loyalty_accounts (user_id, merchant_customer_id, current_points_balance)
      VALUES (v_red.inviter_user_id, p_merchant_customer_id, v_inviter_points)
      RETURNING * INTO v_inviter_account;
    ELSE
      UPDATE loyalty_accounts
      SET current_points_balance = current_points_balance + v_inviter_points, updated_at = v_now
      WHERE id = v_inviter_account.id;
    END IF;

    INSERT INTO point_transactions (loyalty_account_id, merchant_customer_id, points_change, transaction_type, description)
    VALUES (v_inviter_account.id, p_merchant_customer_id, v_inviter_points, 'referral_bonus', 'Empfehlungs-Bonus (Einladender)');

    -- Invitee Bonus
    SELECT * INTO v_invitee_account FROM loyalty_accounts
    WHERE user_id = v_red.invitee_user_id AND merchant_customer_id = p_merchant_customer_id;

    IF NOT FOUND THEN
      INSERT INTO loyalty_accounts (user_id, merchant_customer_id, current_points_balance)
      VALUES (v_red.invitee_user_id, p_merchant_customer_id, v_invitee_points)
      RETURNING * INTO v_invitee_account;
    ELSE
      UPDATE loyalty_accounts
      SET current_points_balance = current_points_balance + v_invitee_points, updated_at = v_now
      WHERE id = v_invitee_account.id;
    END IF;

    INSERT INTO point_transactions (loyalty_account_id, merchant_customer_id, points_change, transaction_type, description)
    VALUES (v_invitee_account.id, p_merchant_customer_id, v_invitee_points, 'referral_bonus', 'Empfehlungs-Bonus (Eingeladener)');

    UPDATE invitation_redemptions SET bonus_awarded_at = v_now WHERE id = v_red.id;
    UPDATE invitations SET status = 'converted' WHERE id = v_red.invitation_id;

    RETURN json_build_object(
      'processed', true,
      'bonus_awarded', true,
      'inviter_points', v_inviter_points,
      'invitee_points', v_invitee_points,
      'inviter_user_id', v_red.inviter_user_id,
      'invitee_user_id', v_red.invitee_user_id
    );
  END IF;

  RETURN json_build_object(
    'processed', true,
    'bonus_awarded', false,
    'invitee_stamped', v_red.invitee_stamped_at IS NOT NULL,
    'inviter_stamped', v_red.inviter_stamped_at IS NOT NULL
  );
END;
$$;
