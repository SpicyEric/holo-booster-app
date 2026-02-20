
-- Sales Leads table for partner-created leads
CREATE TABLE public.sales_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_user_id uuid NOT NULL,
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
  converted_customer_id uuid REFERENCES public.customers(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sales_leads ENABLE ROW LEVEL SECURITY;

-- Partners can manage their own leads
CREATE POLICY "Partners can view their own leads"
  ON public.sales_leads FOR SELECT
  USING (auth.uid() = partner_user_id);

CREATE POLICY "Partners can create leads"
  ON public.sales_leads FOR INSERT
  WITH CHECK (auth.uid() = partner_user_id);

CREATE POLICY "Partners can update their own leads"
  ON public.sales_leads FOR UPDATE
  USING (auth.uid() = partner_user_id);

CREATE POLICY "Partners can delete their own leads"
  ON public.sales_leads FOR DELETE
  USING (auth.uid() = partner_user_id);

-- Admins full access
CREATE POLICY "Admins can manage all sales leads"
  ON public.sales_leads FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Lead activity log for timeline
CREATE TABLE public.lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.sales_leads(id) ON DELETE CASCADE,
  partner_user_id uuid NOT NULL,
  activity_type text NOT NULL, -- 'status_change', 'note', 'call', 'visit'
  old_value text,
  new_value text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can view their lead activities"
  ON public.lead_activities FOR SELECT
  USING (auth.uid() = partner_user_id);

CREATE POLICY "Partners can create lead activities"
  ON public.lead_activities FOR INSERT
  WITH CHECK (auth.uid() = partner_user_id);

CREATE POLICY "Admins can manage all lead activities"
  ON public.lead_activities FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Auto-update updated_at on sales_leads
CREATE TRIGGER update_sales_leads_updated_at
  BEFORE UPDATE ON public.sales_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
