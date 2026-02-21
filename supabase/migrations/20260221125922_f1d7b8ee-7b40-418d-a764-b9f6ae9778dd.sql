-- Drop the old 2-parameter version that causes ambiguity
DROP FUNCTION IF EXISTS public.award_points_via_nfc(text, uuid);
