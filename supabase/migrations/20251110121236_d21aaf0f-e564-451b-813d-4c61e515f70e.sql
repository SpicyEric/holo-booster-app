-- 1. Customer Status History Table (Audit Log)
CREATE TABLE IF NOT EXISTS public.customer_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by_user_id UUID REFERENCES auth.users(id),
  changed_by_email TEXT,
  change_source TEXT NOT NULL, -- 'admin', 'merchant', 'webhook', 'system'
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for faster lookups
CREATE INDEX idx_customer_status_history_customer_id ON public.customer_status_history(customer_id);
CREATE INDEX idx_customer_status_history_created_at ON public.customer_status_history(created_at DESC);

-- Enable RLS
ALTER TABLE public.customer_status_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for status history
CREATE POLICY "Admins can view all status history"
ON public.customer_status_history FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Merchants can view status history of assigned customers"
ON public.customer_status_history FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'merchant'::app_role) AND
  EXISTS (
    SELECT 1 FROM merchant_assignments
    WHERE merchant_assignments.merchant_user_id = auth.uid()
    AND merchant_assignments.customer_id = customer_status_history.customer_id
  )
);

CREATE POLICY "Customers can view their own status history"
ON public.customer_status_history FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM customer_users
    WHERE customer_users.customer_id = customer_status_history.customer_id
    AND customer_users.user_id = auth.uid()
  )
);

-- 2. Customer Files Table
CREATE TABLE IF NOT EXISTS public.customer_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'logo', 'design', 'document', 'other'
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by_user_id UUID REFERENCES auth.users(id),
  uploaded_by_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for faster lookups
CREATE INDEX idx_customer_files_customer_id ON public.customer_files(customer_id);

-- Enable RLS
ALTER TABLE public.customer_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customer files
CREATE POLICY "Admins can view all customer files"
ON public.customer_files FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert customer files"
ON public.customer_files FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update customer files"
ON public.customer_files FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete customer files"
ON public.customer_files FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Merchants can view files of assigned customers"
ON public.customer_files FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'merchant'::app_role) AND
  EXISTS (
    SELECT 1 FROM merchant_assignments
    WHERE merchant_assignments.merchant_user_id = auth.uid()
    AND merchant_assignments.customer_id = customer_files.customer_id
  )
);

-- 3. Trigger to log status changes
CREATE OR REPLACE FUNCTION log_customer_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Get user email if user_id is provided
  IF NEW.status != OLD.status THEN
    -- Try to get the email of the user making the change
    SELECT email INTO user_email
    FROM auth.users
    WHERE id = auth.uid();

    INSERT INTO public.customer_status_history (
      customer_id,
      old_status,
      new_status,
      changed_by_user_id,
      changed_by_email,
      change_source,
      metadata
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      auth.uid(),
      COALESCE(user_email, 'system'),
      CASE
        WHEN auth.uid() IS NOT NULL THEN 'admin'
        ELSE 'system'
      END,
      jsonb_build_object(
        'old_stripe_subscription_id', OLD.stripe_subscription_id,
        'new_stripe_subscription_id', NEW.stripe_subscription_id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER customer_status_change_trigger
AFTER UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION log_customer_status_change();

-- 4. Update trigger for customer_files
CREATE TRIGGER update_customer_files_updated_at
BEFORE UPDATE ON public.customer_files
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();