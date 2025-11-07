-- Pakete/Produkte Tabelle
CREATE TABLE public.packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  billing_interval TEXT NOT NULL DEFAULT 'monthly', -- monthly, yearly, one-time
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Zahlungen Tabelle
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT,
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'completed', -- completed, pending, failed, refunded
  invoice_number TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Kundenabonnements Tabelle
CREATE TABLE public.customer_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES public.packages(id) ON DELETE RESTRICT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active', -- active, cancelled, expired, paused
  created_by UUID REFERENCES auth.users(id), -- Wer hat den Abschluss gemacht (Admin oder Vertriebspartner)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Zusätzliche CRM-Felder zu customers hinzufügen
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS lead_source TEXT,
ADD COLUMN IF NOT EXISTS sales_notes TEXT,
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal', -- low, normal, high, vip
ADD COLUMN IF NOT EXISTS last_contact_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS next_followup_date TIMESTAMP WITH TIME ZONE;

-- Indizes für bessere Performance
CREATE INDEX idx_payments_customer_id ON public.payments(customer_id);
CREATE INDEX idx_payments_payment_date ON public.payments(payment_date DESC);
CREATE INDEX idx_customer_subscriptions_customer_id ON public.customer_subscriptions(customer_id);
CREATE INDEX idx_customer_subscriptions_created_by ON public.customer_subscriptions(created_by);
CREATE INDEX idx_customers_created_at ON public.customers(created_at DESC);

-- Enable RLS
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies für packages
CREATE POLICY "Admins can view all packages"
ON public.packages FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert packages"
ON public.packages FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update packages"
ON public.packages FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete packages"
ON public.packages FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies für payments
CREATE POLICY "Admins can view all payments"
ON public.payments FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert payments"
ON public.payments FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update payments"
ON public.payments FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Merchants can view payments of assigned customers"
ON public.payments FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'merchant') 
  AND EXISTS (
    SELECT 1 FROM merchant_assignments 
    WHERE merchant_assignments.merchant_user_id = auth.uid() 
    AND merchant_assignments.customer_id = payments.customer_id
  )
);

-- RLS Policies für customer_subscriptions
CREATE POLICY "Admins can view all subscriptions"
ON public.customer_subscriptions FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert subscriptions"
ON public.customer_subscriptions FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update subscriptions"
ON public.customer_subscriptions FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Merchants can view subscriptions of assigned customers"
ON public.customer_subscriptions FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'merchant') 
  AND EXISTS (
    SELECT 1 FROM merchant_assignments 
    WHERE merchant_assignments.merchant_user_id = auth.uid() 
    AND merchant_assignments.customer_id = customer_subscriptions.customer_id
  )
);

-- Trigger für updated_at
CREATE TRIGGER update_packages_updated_at
BEFORE UPDATE ON public.packages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customer_subscriptions_updated_at
BEFORE UPDATE ON public.customer_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();