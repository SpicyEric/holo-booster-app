DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trigger_notify_new_app_message'
      AND tgrelid = 'public.app_messages'::regclass
  ) THEN
    CREATE TRIGGER trigger_notify_new_app_message
      AFTER INSERT ON public.app_messages
      FOR EACH ROW
      EXECUTE FUNCTION public.notify_new_app_message();
  END IF;
END $$;