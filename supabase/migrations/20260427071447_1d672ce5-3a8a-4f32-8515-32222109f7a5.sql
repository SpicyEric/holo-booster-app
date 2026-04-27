-- Markiere eine Einladung als "geteilt" (vom Inviter über WhatsApp verschickt).
-- Nur dann soll sie als "Einladung verschickt" in der Statistik zählen.
CREATE OR REPLACE FUNCTION public.mark_invitation_shared(p_share_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_inv RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Nicht authentifiziert');
  END IF;

  SELECT * INTO v_inv FROM invitations WHERE share_code = p_share_code;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Einladung nicht gefunden');
  END IF;

  -- Nur der Inviter darf seine eigene Einladung als geteilt markieren
  IF v_inv.inviter_user_id <> v_user_id THEN
    RETURN json_build_object('success', false, 'error', 'Nicht autorisiert');
  END IF;

  -- Nur upgraden, wenn noch im Urzustand 'pending' (Statistik-relevant).
  -- Bereits angenommene/konvertierte Einladungen werden nicht zurückgesetzt.
  IF v_inv.status = 'pending' THEN
    UPDATE invitations
    SET status = 'sent'
    WHERE id = v_inv.id AND status = 'pending';
  END IF;

  RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_invitation_shared(text) TO authenticated;