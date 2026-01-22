-- Allow 'withdrawn' status on guild_members
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname
    INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.guild_members'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%status%'
    AND pg_get_constraintdef(oid) LIKE '%confirmed%'
    AND pg_get_constraintdef(oid) LIKE '%potential%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.guild_members DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE public.guild_members
  ADD CONSTRAINT guild_members_status_check
  CHECK (status IN ('confirmed', 'potential', 'withdrawn'));
