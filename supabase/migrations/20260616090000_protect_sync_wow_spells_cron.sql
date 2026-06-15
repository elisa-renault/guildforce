DO $$
DECLARE
  function_url text := nullif(current_setting('app.settings.sync_wow_spells_url', true), '');
  cron_secret text := nullif(current_setting('app.settings.cron_secret', true), '');
BEGIN
  IF EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'sync-wow-spells-every-minute'
  ) THEN
    PERFORM cron.unschedule('sync-wow-spells-every-minute');
  END IF;

  IF function_url IS NULL OR cron_secret IS NULL THEN
    RAISE NOTICE 'sync-wow-spells cron not scheduled: set app.settings.sync_wow_spells_url and app.settings.cron_secret, then rerun this migration or schedule the job manually.';
    RETURN;
  END IF;

  PERFORM cron.schedule(
    'sync-wow-spells-every-minute',
    '* * * * *',
    format(
      $cron$
      SELECT
        net.http_post(
          url := %L,
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-cron-secret', %L
          ),
          body := jsonb_build_object()
        );
      $cron$,
      function_url,
      cron_secret
    )
  );
END $$;
