-- ============================================================
-- A) DATEN-CLEANUP: Duplikat-Chips entfernen
-- Regel pro (merchant_customer_id, stamp_color):
--   * Behalte den Eintrag MIT hardware_uid (echter Chip).
--   * Lösche den Eintrag OHNE hardware_uid (Platzhalter).
-- Falls beide eine UID haben → behalte den ÄLTESTEN (idR. echter Chip).
-- Falls keiner eine UID hat → behalte den ÄLTESTEN.
-- ============================================================
WITH ranked AS (
  SELECT
    id,
    merchant_customer_id,
    stamp_color,
    hardware_uid,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY merchant_customer_id, stamp_color
      ORDER BY
        (CASE WHEN hardware_uid IS NOT NULL AND trim(hardware_uid) <> '' THEN 0 ELSE 1 END),
        created_at ASC
    ) AS rn
  FROM nfc_chips
  WHERE merchant_customer_id IS NOT NULL
)
DELETE FROM nfc_chips
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- A.1) Backstube König grün: korrigiere points_value von 1 → 5
UPDATE nfc_chips
SET points_value = 5
WHERE merchant_customer_id = 'e828d21a-f7c5-4c8e-bc8d-6301e3e3ab45'
  AND stamp_color = 'grün'
  AND points_value = 1;

-- ============================================================
-- C) SCHEMA-SCHUTZ: Unique-Constraint pro (merchant, color)
-- Verhindert künftige Duplikate auf DB-Ebene.
-- Greift nur, wenn merchant_customer_id gesetzt ist.
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS nfc_chips_unique_merchant_color
  ON nfc_chips (merchant_customer_id, stamp_color)
  WHERE merchant_customer_id IS NOT NULL;
