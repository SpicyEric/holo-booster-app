
-- Create trigger on app_messages to fire push notifications via the existing notify_new_app_message function
CREATE TRIGGER trigger_notify_new_app_message
  AFTER INSERT ON public.app_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_app_message();
