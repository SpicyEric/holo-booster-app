
-- Drop the welcome message trigger (correct name)
DROP TRIGGER IF EXISTS trigger_send_welcome_message ON public.loyalty_accounts;

-- Drop the welcome message function
DROP FUNCTION IF EXISTS public.send_welcome_message() CASCADE;
