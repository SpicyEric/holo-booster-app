ALTER TABLE public.rewards
  ADD COLUMN IF NOT EXISTS marketing_text text,
  ADD COLUMN IF NOT EXISTS marketing_emoji text;