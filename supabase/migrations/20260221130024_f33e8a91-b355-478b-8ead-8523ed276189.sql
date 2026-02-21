-- Drop the old unique constraint on chip_uid alone
ALTER TABLE public.nfc_chips DROP CONSTRAINT nfc_chips_chip_uid_key;

-- Add a composite unique constraint: one stamp per box per color
ALTER TABLE public.nfc_chips ADD CONSTRAINT nfc_chips_chip_uid_stamp_color_key UNIQUE (chip_uid, stamp_color);