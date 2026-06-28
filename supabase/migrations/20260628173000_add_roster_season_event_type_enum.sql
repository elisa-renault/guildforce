-- Compatibility enum for roster season event casts used by materialization RPCs.
-- The roster_season_events.event_type column remains TEXT for historical flexibility.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'roster_season_event_type'
  ) THEN
    CREATE TYPE public.roster_season_event_type AS ENUM (
      'member_joined',
      'member_departed',
      'member_removed',
      'member_status_changed',
      'roster_selection_changed',
      'assignment_created',
      'assignment_updated',
      'assignment_removed',
      'season_sync_delta_applied',
      'wishes_updated'
    );
  END IF;
END;
$$;
