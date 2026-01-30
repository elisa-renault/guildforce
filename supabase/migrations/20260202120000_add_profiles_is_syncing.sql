-- Add is_syncing flag for resync locking
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_syncing boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.is_syncing IS 'True while a Battle.net resync is in progress for the user';
