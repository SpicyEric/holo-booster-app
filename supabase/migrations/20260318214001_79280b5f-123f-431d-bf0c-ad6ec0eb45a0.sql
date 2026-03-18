-- Create a database function that calls the edge function when a new app_message is inserted
CREATE OR REPLACE FUNCTION public.notify_new_app_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  payload json;
BEGIN
  payload := json_build_object('record', row_to_json(NEW));
  
  PERFORM net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/on-new-app-message',
    headers := json_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    )::jsonb,
    body := payload::jsonb
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger on app_messages table
CREATE TRIGGER on_new_app_message_trigger
  AFTER INSERT ON public.app_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_app_message();