ALTER TABLE public.nfc_chips DROP CONSTRAINT IF EXISTS nfc_chips_unique_merchant_color;
DROP INDEX IF EXISTS public.nfc_chips_unique_merchant_color;