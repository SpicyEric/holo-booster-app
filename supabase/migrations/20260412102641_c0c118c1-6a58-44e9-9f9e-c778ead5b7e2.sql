
-- Fix NFC chips that were registered via Box Management without merchant_customer_id
UPDATE public.nfc_chips SET merchant_customer_id = 'a19f717e-56d0-4660-b1c8-bf97dfba0472' WHERE id = '1a398497-1c2c-478a-a9df-696c7711c287' AND merchant_customer_id IS NULL;
UPDATE public.nfc_chips SET merchant_customer_id = 'e828d21a-f7c5-4c8e-bc8d-6301e3e3ab45' WHERE id = 'f1d8d084-1853-4ba1-bf53-e496bc7ee0cd' AND merchant_customer_id IS NULL;
UPDATE public.nfc_chips SET merchant_customer_id = '4061dfcd-ad2e-4cce-8665-32df97dbd3e2' WHERE id = 'c35705dd-05f1-4a9a-83b0-a0029ad24d5e' AND merchant_customer_id IS NULL;
UPDATE public.nfc_chips SET merchant_customer_id = '516ca9aa-6a09-485c-8408-836a1b66e220' WHERE id = 'b46a3137-a9f9-49b4-9730-b90ceb0c919e' AND merchant_customer_id IS NULL;
