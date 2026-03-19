
CREATE OR REPLACE FUNCTION public.notify_new_app_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  payload json;
  supabase_url text := 'https://xcnfyawyoahlbhwfkyku.supabase.co';
  service_key text;
BEGIN
  service_key := coalesce(
    current_setting('app.settings.service_role_key', true),
    current_setting('supabase.service_role_key', true)
  );

  IF service_key IS NOT NULL AND service_key != '' THEN
    payload := json_build_object('record', row_to_json(NEW));
    
    PERFORM net.http_post(
      url := supabase_url || '/functions/v1/on-new-app-message',
      headers := json_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_key
      )::jsonb,
      body := payload::jsonb
    );
  END IF;
  
  RETURN NEW;
END;
$function$;
