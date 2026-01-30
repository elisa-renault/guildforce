DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'sync-wow-spells-every-minute'
  ) THEN
    PERFORM cron.schedule(
      'sync-wow-spells-every-minute',
      '* * * * *',
      $cron$
      SELECT
        net.http_post(
          url := 'https://nztgnodoxfxjgbgcysge.supabase.co/functions/v1/sync-wow-spells',
          headers := jsonb_build_object('Content-Type', 'application/json'),
          body := jsonb_build_object()
        );
      $cron$
    );
  END IF;
END $$;
