-- Drop and recreate the check constraint to include 'offen'
ALTER TABLE public.eloyo_boxes DROP CONSTRAINT IF EXISTS eloyo_boxes_status_check;
ALTER TABLE public.eloyo_boxes ADD CONSTRAINT eloyo_boxes_status_check 
  CHECK (status IN ('offen', 'verfuegbar', 'versendet', 'abgeschlossen', 'retourniert', 'in_rechnung_gestellt'));