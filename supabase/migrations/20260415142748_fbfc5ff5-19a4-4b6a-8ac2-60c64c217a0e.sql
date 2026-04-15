
CREATE OR REPLACE FUNCTION public.auto_close_eloyo_box()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When haendler_id is newly set, mark box as abgeschlossen
  IF NEW.haendler_id IS NOT NULL AND (OLD.haendler_id IS NULL OR OLD.haendler_id IS DISTINCT FROM NEW.haendler_id) THEN
    NEW.status := 'abgeschlossen';
    NEW.abschlussdatum := COALESCE(NEW.abschlussdatum, now());
  END IF;

  -- After updating, check if all siblings in the paket are done
  IF NEW.status IN ('abgeschlossen', 'retourniert') AND NEW.paket_id IS NOT NULL THEN
    PERFORM 1 FROM eloyo_boxes 
    WHERE paket_id = NEW.paket_id 
      AND id != NEW.id 
      AND status NOT IN ('abgeschlossen', 'retourniert');
    
    IF NOT FOUND THEN
      UPDATE box_pakete SET status = 'abgeschlossen', updated_at = now() 
      WHERE id = NEW.paket_id AND status != 'abgeschlossen';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_close_eloyo_box
BEFORE UPDATE ON public.eloyo_boxes
FOR EACH ROW
EXECUTE FUNCTION public.auto_close_eloyo_box();
