
-- Rename box_id → stamp_id in boxes table
ALTER TABLE public.boxes RENAME COLUMN box_id TO stamp_id;

-- Rename box_id → stamp_id in customers table
ALTER TABLE public.customers RENAME COLUMN box_id TO stamp_id;
