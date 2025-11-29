-- Add onboarding_email_sent_at column for idempotency tracking
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS onboarding_email_sent_at TIMESTAMPTZ DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.customers.onboarding_email_sent_at IS 'Timestamp when onboarding email was sent to prevent duplicate sends';