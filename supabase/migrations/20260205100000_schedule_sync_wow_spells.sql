DO $$
DECLARE
  function_url text := nullif(current_setting('app.settings.sync_wow_spells_url', true), '');
  cron_secret text := nullif(current_setting('app.settings.cron_secret', true), '');
BEGIN
  IF function_url IS NULL OR cron_secret IS NULL THEN
    RAISE NOTICE 'Skipping sync-wow-spells cron schedule: set app.settings.sync_wow_spells_url and app.settings.cron_secret first.';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'sync-wow-spells-every-minute'
  ) THEN
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
  END IF;
END $$;
