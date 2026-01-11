
-- Create rosters table
CREATE TABLE public.rosters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(guild_id, name)
);

-- Create roster_access_rules table
CREATE TABLE public.roster_access_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roster_id UUID NOT NULL REFERENCES public.rosters(id) ON DELETE CASCADE,
  access_type TEXT NOT NULL CHECK (access_type IN ('user', 'rank')),
  user_id UUID,
  min_rank_index INTEGER,
  max_rank_index INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_user_access CHECK (
    access_type != 'user' OR user_id IS NOT NULL
  ),
  CONSTRAINT valid_rank_access CHECK (
    access_type != 'rank' OR (min_rank_index IS NOT NULL AND max_rank_index IS NOT NULL)
  )
);

-- Add roster_id column to class_wishes (nullable for now, will migrate data)
ALTER TABLE public.class_wishes ADD COLUMN roster_id UUID REFERENCES public.rosters(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE public.rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roster_access_rules ENABLE ROW LEVEL SECURITY;

-- Function to check if user is GM of a guild
CREATE OR REPLACE FUNCTION public.is_guild_gm(p_guild_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.guild_members
    WHERE guild_id = p_guild_id
      AND user_id = p_user_id
      AND role = 'gm'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to check if user has access to a roster
CREATE OR REPLACE FUNCTION public.has_roster_access(p_roster_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_guild_id UUID;
  v_user_rank INTEGER;
BEGIN
  -- Get the guild_id for this roster
  SELECT guild_id INTO v_guild_id FROM public.rosters WHERE id = p_roster_id;
  
  IF v_guild_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- GMs always have access
  IF is_guild_gm(v_guild_id, p_user_id) THEN
    RETURN TRUE;
  END IF;
  
  -- Check for direct user access rule
  IF EXISTS (
    SELECT 1 FROM public.roster_access_rules
    WHERE roster_id = p_roster_id
      AND access_type = 'user'
      AND user_id = p_user_id
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Check for rank-based access
  -- Get user's best rank in the guild (lowest rank_index = highest rank)
  SELECT MIN(wgm.rank_index) INTO v_user_rank
  FROM public.wow_guild_memberships wgm
  JOIN public.guilds g ON (
    LOWER(g.name) = LOWER(wgm.guild_name)
    AND LOWER(g.server) = LOWER(wgm.guild_realm_slug)
    AND LOWER(g.region) = LOWER(wgm.guild_region)
  )
  WHERE g.id = v_guild_id
    AND wgm.user_id = p_user_id;
  
  IF v_user_rank IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.roster_access_rules
      WHERE roster_id = p_roster_id
        AND access_type = 'rank'
        AND v_user_rank >= min_rank_index
        AND v_user_rank <= max_rank_index
    ) THEN
      RETURN TRUE;
    END IF;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- RLS Policies for rosters
CREATE POLICY "Rosters viewable by guild members"
  ON public.rosters FOR SELECT
  USING (is_guild_member(guild_id, auth.uid()));

CREATE POLICY "GMs can create rosters"
  ON public.rosters FOR INSERT
  WITH CHECK (is_guild_gm(guild_id, auth.uid()));

CREATE POLICY "GMs can update rosters"
  ON public.rosters FOR UPDATE
  USING (is_guild_gm(guild_id, auth.uid()));

CREATE POLICY "GMs can delete non-default rosters"
  ON public.rosters FOR DELETE
  USING (is_guild_gm(guild_id, auth.uid()) AND is_default = false);

-- RLS Policies for roster_access_rules
CREATE POLICY "Access rules viewable by guild members"
  ON public.roster_access_rules FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.rosters r
    WHERE r.id = roster_id
      AND is_guild_member(r.guild_id, auth.uid())
  ));

CREATE POLICY "GMs can manage access rules"
  ON public.roster_access_rules FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.rosters r
    WHERE r.id = roster_id
      AND is_guild_gm(r.guild_id, auth.uid())
  ));

-- Update class_wishes policies to check roster access
CREATE POLICY "Users can create wishes for accessible rosters"
  ON public.class_wishes FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (roster_id IS NULL OR has_roster_access(roster_id, auth.uid()))
  );

DROP POLICY IF EXISTS "Users can update their own wishes" ON public.class_wishes;
CREATE POLICY "Users can update their own wishes"
  ON public.class_wishes FOR UPDATE
  USING (
    auth.uid() = user_id
    AND (roster_id IS NULL OR has_roster_access(roster_id, auth.uid()))
  );

-- Create default rosters for existing guilds and migrate wishes
DO $$
DECLARE
  guild_rec RECORD;
  new_roster_id UUID;
BEGIN
  FOR guild_rec IN SELECT id FROM public.guilds LOOP
    -- Create default roster
    INSERT INTO public.rosters (guild_id, name, is_default)
    VALUES (guild_rec.id, 'Principal', true)
    RETURNING id INTO new_roster_id;
    
    -- Add "all ranks" access rule (rank 0-99 covers all possible ranks)
    INSERT INTO public.roster_access_rules (roster_id, access_type, min_rank_index, max_rank_index)
    VALUES (new_roster_id, 'rank', 0, 99);
    
    -- Migrate existing wishes to the default roster
    UPDATE public.class_wishes
    SET roster_id = new_roster_id
    WHERE guild_id = guild_rec.id AND roster_id IS NULL;
  END LOOP;
END $$;

-- Update trigger for rosters
CREATE TRIGGER update_rosters_updated_at
  BEFORE UPDATE ON public.rosters
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
