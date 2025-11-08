-- Idempotency: Events processed tracking
CREATE TABLE IF NOT EXISTS public.events_processed (
  stripe_event_id TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.events_processed ENABLE ROW LEVEL SECURITY;

-- Admin policy
CREATE POLICY "Admins can view events_processed"
ON public.events_processed
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Customer Number Generator: Custom format CUR-YYYYMM-####
CREATE OR REPLACE FUNCTION public.generate_customer_number()
RETURNS TEXT AS $$
DECLARE
  year_month TEXT;
  next_seq INTEGER;
  new_number TEXT;
BEGIN
  year_month := TO_CHAR(NOW(), 'YYYYMM');
  
  -- Get next sequence number for this month
  SELECT COALESCE(MAX(CAST(SUBSTRING(customer_number FROM 12) AS INTEGER)), 0) + 1
  INTO next_seq
  FROM customers
  WHERE customer_number LIKE 'CUR-' || year_month || '-%';
  
  new_number := 'CUR-' || year_month || '-' || LPAD(next_seq::TEXT, 4, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate customer number
CREATE OR REPLACE FUNCTION public.set_customer_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.customer_number IS NULL THEN
    NEW.customer_number := generate_customer_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_customer_number
BEFORE INSERT ON public.customers
FOR EACH ROW
EXECUTE FUNCTION set_customer_number();