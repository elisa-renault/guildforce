-- Add granular battletag visibility field
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS battletag_visibility text NOT NULL DEFAULT 'everyone';

-- Migrate existing data from show_battletag boolean
UPDATE public.profiles 
SET battletag_visibility = CASE 
  WHEN show_battletag = false THEN 'guild_only'
  ELSE 'everyone'
END
WHERE battletag_visibility = 'everyone';

-- Add check constraint for valid values
ALTER TABLE public.profiles
ADD CONSTRAINT battletag_visibility_check 
CHECK (battletag_visibility IN ('everyone', 'guild_only', 'nobody'));