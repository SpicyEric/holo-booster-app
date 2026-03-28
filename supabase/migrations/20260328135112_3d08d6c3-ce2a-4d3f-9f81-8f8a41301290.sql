
-- Add linked_customer_id to discovered_stores
ALTER TABLE public.discovered_stores
ADD COLUMN linked_customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;

-- Create trigger: when customer status changes to 'cancelled', move linked contacts to 'verloren'
CREATE OR REPLACE FUNCTION public.sync_customer_status_to_pipeline()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'cancelled' AND (OLD.status IS DISTINCT FROM 'cancelled') THEN
    UPDATE discovered_stores
    SET status = 'verloren', updated_at = now()
    WHERE linked_customer_id = NEW.id;
  END IF;
  
  IF NEW.status = 'paused' AND (OLD.status IS DISTINCT FROM 'paused') THEN
    UPDATE discovered_stores
    SET status = 'standby', updated_at = now()
    WHERE linked_customer_id = NEW.id;
  END IF;

  IF NEW.status = 'active' AND OLD.status IN ('cancelled', 'paused') THEN
    UPDATE discovered_stores
    SET status = 'gewonnen', updated_at = now()
    WHERE linked_customer_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_customer_status_to_pipeline
AFTER UPDATE OF status ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.sync_customer_status_to_pipeline();
