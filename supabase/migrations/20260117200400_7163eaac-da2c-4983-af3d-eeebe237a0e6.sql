-- Change default value for battletag_visibility to 'nobody' for new users
ALTER TABLE public.profiles 
ALTER COLUMN battletag_visibility SET DEFAULT 'nobody';