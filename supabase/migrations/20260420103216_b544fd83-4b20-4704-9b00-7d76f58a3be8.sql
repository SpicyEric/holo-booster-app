-- Fix Backstube König: Stempel-ID am Händler-Datensatz nachtragen und
-- den bereits registrierten NFC-Chip dem Händler zuordnen.
UPDATE public.customers
SET stamp_id = 'QDWW3-PYAQ7-AVBCJ'
WHERE id = 'e828d21a-f7c5-4c8e-bc8d-6301e3e3ab45'
  AND (stamp_id IS NULL OR stamp_id = '');

UPDATE public.nfc_chips
SET merchant_customer_id = 'e828d21a-f7c5-4c8e-bc8d-6301e3e3ab45'
WHERE chip_uid = 'QDWW3-PYAQ7-AVBCJ'
  AND merchant_customer_id IS NULL;