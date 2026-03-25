
-- Admin pipeline leads table for CRM
CREATE TABLE public.pipeline_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  shop_name text NOT NULL,
  contact_person text,
  phone text,
  email text,
  street text,
  house_number text,
  postal_code text,
  city text,
  industry text,
  status text NOT NULL DEFAULT 'new',
  priority text DEFAULT 'normal',
  notes text,
  next_contact_date timestamptz,
  last_contact_date timestamptz,
  source text DEFAULT 'manual',
  churned_customer_id uuid,
  latitude numeric,
  longitude numeric
);

ALTER TABLE public.pipeline_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage pipeline leads" ON public.pipeline_leads
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Pipeline lead notes
CREATE TABLE public.pipeline_lead_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.pipeline_leads(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  note text NOT NULL,
  created_by_user_id uuid
);

ALTER TABLE public.pipeline_lead_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage pipeline notes" ON public.pipeline_lead_notes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admin to merchant messages
CREATE TABLE public.admin_merchant_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  sent_by_user_id uuid,
  subject text NOT NULL,
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_merchant_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage admin messages" ON public.admin_merchant_messages
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Merchants can view their messages" ON public.admin_merchant_messages
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM merchant_assignments
    WHERE merchant_assignments.merchant_user_id = auth.uid()
    AND merchant_assignments.customer_id = admin_merchant_messages.customer_id
  ));

CREATE POLICY "Merchants can mark messages read" ON public.admin_merchant_messages
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM merchant_assignments
    WHERE merchant_assignments.merchant_user_id = auth.uid()
    AND merchant_assignments.customer_id = admin_merchant_messages.customer_id
  ));
