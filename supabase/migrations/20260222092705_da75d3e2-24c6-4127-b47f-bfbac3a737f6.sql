
-- Table for scheduled activities / follow-ups on leads
CREATE TABLE public.lead_scheduled_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.sales_leads(id) ON DELETE CASCADE,
  partner_user_id uuid NOT NULL,
  activity_type text NOT NULL DEFAULT 'call', -- call, meeting, follow_up, other
  title text NOT NULL,
  description text,
  scheduled_at timestamp with time zone NOT NULL,
  completed_at timestamp with time zone,
  reminder_sent boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_scheduled_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can view their own scheduled activities"
  ON public.lead_scheduled_activities FOR SELECT
  USING (auth.uid() = partner_user_id);

CREATE POLICY "Partners can create their own scheduled activities"
  ON public.lead_scheduled_activities FOR INSERT
  WITH CHECK (auth.uid() = partner_user_id);

CREATE POLICY "Partners can update their own scheduled activities"
  ON public.lead_scheduled_activities FOR UPDATE
  USING (auth.uid() = partner_user_id);

CREATE POLICY "Partners can delete their own scheduled activities"
  ON public.lead_scheduled_activities FOR DELETE
  USING (auth.uid() = partner_user_id);

CREATE POLICY "Admins can manage all scheduled activities"
  ON public.lead_scheduled_activities FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_lead_scheduled_activities_updated_at
  BEFORE UPDATE ON public.lead_scheduled_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
