ALTER TABLE public.invitation_redemptions
  DROP CONSTRAINT IF EXISTS invitation_redemptions_invitee_user_id_key;

CREATE INDEX IF NOT EXISTS idx_invitation_redemptions_invitee_user_id
  ON public.invitation_redemptions(invitee_user_id);

CREATE INDEX IF NOT EXISTS idx_invitation_redemptions_open_by_invitee
  ON public.invitation_redemptions(invitee_user_id, bonus_awarded_at, bonus_window_starts_at);
