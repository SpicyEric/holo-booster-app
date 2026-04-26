-- Enable realtime updates for tables used by OpenInvitationsBanner and MerchantDetail auto-refresh
ALTER TABLE public.invitations REPLICA IDENTITY FULL;
ALTER TABLE public.invitation_redemptions REPLICA IDENTITY FULL;
ALTER TABLE public.point_transactions REPLICA IDENTITY FULL;
ALTER TABLE public.loyalty_accounts REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.invitations; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.invitation_redemptions; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.point_transactions; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.loyalty_accounts; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;