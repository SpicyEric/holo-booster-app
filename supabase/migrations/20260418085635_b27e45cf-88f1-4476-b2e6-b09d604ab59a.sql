-- Cronjob: täglich 03:00 UTC – markiert Vertriebler als inaktiv,
-- die seit > 30 Tagen die neue Vertragsversion nicht angenommen haben.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-vertrag-outdated-daily') THEN
    PERFORM cron.unschedule('cleanup-vertrag-outdated-daily');
  END IF;
END $$;

SELECT cron.schedule(
  'cleanup-vertrag-outdated-daily',
  '0 3 * * *',
  $job$
  SELECT net.http_post(
    url := 'https://xcnfyawyoahlbhwfkyku.supabase.co/functions/v1/cleanup-vertrag-outdated',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjbmZ5YXd5b2FobGJod2ZreWt1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyOTUyMzgsImV4cCI6MjA3Nzg3MTIzOH0.2o5f4BX3f0_SZUuuurm5kXnlJRXDtq4CiKzFFyIyIkg"}'::jsonb,
    body := '{}'::jsonb
  );
  $job$
);