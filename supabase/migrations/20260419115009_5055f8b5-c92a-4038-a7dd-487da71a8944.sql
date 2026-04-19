
-- Push notification logs for admin observability
CREATE TABLE public.push_notification_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID,
  recipient_email TEXT,
  recipient_name TEXT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  source TEXT,
  trigger_function TEXT,
  device_count INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  invalid_token_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  fcm_responses JSONB,
  metadata JSONB
);

CREATE INDEX idx_push_notification_logs_created_at ON public.push_notification_logs (created_at DESC);
CREATE INDEX idx_push_notification_logs_user_id ON public.push_notification_logs (user_id);
CREATE INDEX idx_push_notification_logs_status ON public.push_notification_logs (status);

ALTER TABLE public.push_notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all push logs"
  ON public.push_notification_logs
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can insert push logs"
  ON public.push_notification_logs
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can delete push logs"
  ON public.push_notification_logs
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
