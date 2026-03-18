-- Create device_tokens table for FCM push notifications
CREATE TABLE public.device_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  fcm_token text NOT NULL,
  platform text NOT NULL DEFAULT 'android',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, fcm_token)
);

-- Enable RLS
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

-- Users can insert their own tokens
CREATE POLICY "Users can insert their own device tokens"
ON public.device_tokens FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can view their own tokens
CREATE POLICY "Users can view their own device tokens"
ON public.device_tokens FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Users can update their own tokens
CREATE POLICY "Users can update their own device tokens"
ON public.device_tokens FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

-- Users can delete their own tokens
CREATE POLICY "Users can delete their own device tokens"
ON public.device_tokens FOR DELETE TO authenticated
USING (auth.uid() = user_id);