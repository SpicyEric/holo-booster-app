
-- Add offer_id and offer_redeemed_at to app_messages for offer tracking
ALTER TABLE public.app_messages 
ADD COLUMN offer_id uuid REFERENCES public.offers(id) ON DELETE SET NULL,
ADD COLUMN offer_redeemed_at timestamp with time zone;

-- Add birthday gift type and offer fields to customers
ALTER TABLE public.customers
ADD COLUMN birthday_gift_type text DEFAULT 'points',
ADD COLUMN birthday_offer_title text,
ADD COLUMN birthday_offer_description text;

-- Update default birthday_bonus_points to 5
ALTER TABLE public.customers ALTER COLUMN birthday_bonus_points SET DEFAULT 5;
