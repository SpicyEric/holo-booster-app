ALTER TABLE public.app_messages ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.app_messages ADD COLUMN IF NOT EXISTS bonus_points integer;
ALTER TABLE public.app_messages ADD COLUMN IF NOT EXISTS bonus_points_claimed_at timestamp with time zone;