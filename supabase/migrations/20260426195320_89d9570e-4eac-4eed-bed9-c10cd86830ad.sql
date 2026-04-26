-- Update default value for referral inviter points to 20
ALTER TABLE public.customers
  ALTER COLUMN referral_inviter_points SET DEFAULT 20;

-- Update existing customers that still have the old default value (3) to the new default (20)
UPDATE public.customers
SET referral_inviter_points = 20
WHERE referral_inviter_points = 3;