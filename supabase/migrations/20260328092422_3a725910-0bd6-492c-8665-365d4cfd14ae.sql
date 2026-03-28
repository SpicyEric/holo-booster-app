-- Add note_title to discovered_stores for inline note titles
ALTER TABLE public.discovered_stores ADD COLUMN IF NOT EXISTS note_title text;

-- Create pipeline_appointments table for calendar
CREATE TABLE public.pipeline_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.discovered_stores(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  scheduled_at timestamp with time zone NOT NULL,
  duration_minutes integer DEFAULT 60,
  created_by_user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.pipeline_appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage pipeline appointments"
ON public.pipeline_appointments FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));