-- Step 1: Create default rosters for existing guilds without one
DO $$
DECLARE
  guild_rec RECORD;
  new_roster_id UUID;
BEGIN
  FOR guild_rec IN 
    SELECT g.id FROM public.guilds g
    WHERE NOT EXISTS (SELECT 1 FROM public.rosters r WHERE r.guild_id = g.id)
  LOOP
    INSERT INTO public.rosters (guild_id, name, is_default)
    VALUES (guild_rec.id, 'Principal', true)
    RETURNING id INTO new_roster_id;
    
    INSERT INTO public.roster_access_rules (roster_id, access_type, min_rank_index, max_rank_index)
    VALUES (new_roster_id, 'rank', 0, 99);
  END LOOP;
END $$;

-- Step 2: Create trigger function for future guilds
CREATE OR REPLACE FUNCTION public.create_default_roster()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_roster_id UUID;
BEGIN
  INSERT INTO public.rosters (guild_id, name, is_default)
  VALUES (NEW.id, 'Principal', true)
  RETURNING id INTO new_roster_id;
  
  INSERT INTO public.roster_access_rules (roster_id, access_type, min_rank_index, max_rank_index)
  VALUES (new_roster_id, 'rank', 0, 99);
  
  RETURN NEW;
END;
$$;

-- Step 3: Create the trigger
CREATE TRIGGER on_guild_created_create_default_roster
  AFTER INSERT ON public.guilds
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_roster();