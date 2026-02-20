
-- Add columns for configurable Google review points
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS google_review_points_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS google_review_points_value integer DEFAULT 5;
