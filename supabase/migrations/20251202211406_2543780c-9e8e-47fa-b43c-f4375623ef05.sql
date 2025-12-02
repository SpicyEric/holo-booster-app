-- Add stamp_preset column to boxes table
ALTER TABLE public.boxes 
ADD COLUMN stamp_preset text NOT NULL DEFAULT 'standard_3';

-- Add comment for documentation
COMMENT ON COLUMN public.boxes.stamp_preset IS 'Stamp configuration preset: standard_3 = green/blue/red stamps';