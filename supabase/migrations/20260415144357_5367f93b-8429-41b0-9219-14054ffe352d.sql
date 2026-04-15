
CREATE TABLE public.sales_rep_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  notification_type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sales_rep_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
ON public.sales_rep_notifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can mark own notifications as read"
ON public.sales_rep_notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can insert notifications"
ON public.sales_rep_notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE INDEX idx_sales_rep_notifications_user_id ON public.sales_rep_notifications(user_id);
CREATE INDEX idx_sales_rep_notifications_unread ON public.sales_rep_notifications(user_id, read_at) WHERE read_at IS NULL;
