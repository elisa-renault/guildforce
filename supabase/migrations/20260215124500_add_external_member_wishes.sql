-- External (non-registered) member wishes support for roster analytics.

CREATE TABLE IF NOT EXISTS public.external_member_wishes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
  roster_id UUID NOT NULL REFERENCES public.rosters(id) ON DELETE CASCADE,
  roster_cache_id UUID NOT NULL REFERENCES public.guild_roster_cache(id) ON DELETE CASCADE,
  choice_index INTEGER NOT NULL DEFAULT 1 CHECK (choice_index >= 1 AND choice_index <= 13),
  class_id TEXT NOT NULL,
  spec_ids TEXT[] NOT NULL DEFAULT '{}',
  spec_order TEXT[] NOT NULL DEFAULT '{}',
  comment TEXT,
  validation_status TEXT NOT NULL DEFAULT 'approved' CHECK (validation_status IN ('pending', 'approved', 'rejected')),
  validated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  validated_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (roster_id, roster_cache_id, choice_index)
);

CREATE INDEX IF NOT EXISTS idx_external_member_wishes_guild_roster
  ON public.external_member_wishes(guild_id, roster_id);

CREATE INDEX IF NOT EXISTS idx_external_member_wishes_roster_cache
  ON public.external_member_wishes(roster_cache_id);

ALTER TABLE public.external_member_wishes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Guild members can view external member wishes" ON public.external_member_wishes;
CREATE POLICY "Guild members can view external member wishes"
ON public.external_member_wishes
FOR SELECT
USING (public.is_guild_member(guild_id, auth.uid()));

DROP POLICY IF EXISTS "Wish managers can manage external member wishes" ON public.external_member_wishes;
CREATE POLICY "Wish managers can manage external member wishes"
ON public.external_member_wishes
FOR ALL
USING (
  public.is_guild_gm(guild_id, auth.uid())
  OR public.has_guild_permission(guild_id, auth.uid(), 'manage_wishes')
)
WITH CHECK (
  public.is_guild_gm(guild_id, auth.uid())
  OR public.has_guild_permission(guild_id, auth.uid(), 'manage_wishes')
);

CREATE TRIGGER update_external_member_wishes_updated_at
  BEFORE UPDATE ON public.external_member_wishes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.upsert_external_member_wish(
  p_roster_id UUID,
  p_roster_cache_id UUID,
  p_class_id TEXT,
  p_spec_ids TEXT[] DEFAULT '{}',
  p_comment TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID;
  v_guild_id UUID;
  v_matched_user_id UUID;
  v_existing_id UUID;
  v_spec_order TEXT[];
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT guild_id INTO v_guild_id
  FROM public.rosters
  WHERE id = p_roster_id;

  IF v_guild_id IS NULL THEN
    RAISE EXCEPTION 'Roster not found';
  END IF;

  IF NOT (
    public.is_guild_gm(v_guild_id, v_actor)
    OR public.has_guild_permission(v_guild_id, v_actor, 'manage_wishes')
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT matched_user_id
    INTO v_matched_user_id
  FROM public.guild_roster_cache
  WHERE id = p_roster_cache_id
    AND guild_id = v_guild_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Roster cache member not found for this guild';
  END IF;

  v_spec_order := COALESCE(p_spec_ids, ARRAY[]::TEXT[]);

  -- If member is already linked to a Guildforce user, persist directly in class_wishes.
  IF v_matched_user_id IS NOT NULL THEN
    UPDATE public.class_wishes
    SET class_id = p_class_id,
        spec_ids = v_spec_order,
        spec_order = v_spec_order,
        comment = p_comment,
        validation_status = 'approved',
        validated_by = v_actor,
        validated_at = now(),
        updated_at = now()
    WHERE guild_id = v_guild_id
      AND roster_id = p_roster_id
      AND user_id = v_matched_user_id
      AND choice_index = 1;

    IF NOT FOUND THEN
      INSERT INTO public.class_wishes (
        guild_id,
        roster_id,
        user_id,
        choice_index,
        class_id,
        spec_ids,
        spec_order,
        comment,
        validation_status,
        validated_by,
        validated_at
      ) VALUES (
        v_guild_id,
        p_roster_id,
        v_matched_user_id,
        1,
        p_class_id,
        v_spec_order,
        v_spec_order,
        p_comment,
        'approved',
        v_actor,
        now()
      );
    END IF;

    RETURN NULL;
  END IF;

  SELECT id
    INTO v_existing_id
  FROM public.external_member_wishes
  WHERE roster_id = p_roster_id
    AND roster_cache_id = p_roster_cache_id
    AND choice_index = 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.external_member_wishes
    SET class_id = p_class_id,
        spec_ids = v_spec_order,
        spec_order = v_spec_order,
        comment = p_comment,
        validation_status = 'approved',
        validated_by = v_actor,
        validated_at = now(),
        updated_at = now()
    WHERE id = v_existing_id;

    RETURN v_existing_id;
  END IF;

  INSERT INTO public.external_member_wishes (
    guild_id,
    roster_id,
    roster_cache_id,
    choice_index,
    class_id,
    spec_ids,
    spec_order,
    comment,
    validation_status,
    validated_by,
    validated_at,
    created_by
  ) VALUES (
    v_guild_id,
    p_roster_id,
    p_roster_cache_id,
    1,
    p_class_id,
    v_spec_order,
    v_spec_order,
    p_comment,
    'approved',
    v_actor,
    now(),
    v_actor
  )
  RETURNING id INTO v_existing_id;

  RETURN v_existing_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_external_member_wish(
  p_external_wish_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID;
  v_guild_id UUID;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT guild_id
    INTO v_guild_id
  FROM public.external_member_wishes
  WHERE id = p_external_wish_id;

  IF v_guild_id IS NULL THEN
    RAISE EXCEPTION 'External member wish not found';
  END IF;

  IF NOT (
    public.is_guild_gm(v_guild_id, v_actor)
    OR public.has_guild_permission(v_guild_id, v_actor, 'manage_wishes')
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  DELETE FROM public.external_member_wishes
  WHERE id = p_external_wish_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.transfer_external_wishes_to_matched_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry RECORD;
BEGIN
  IF NEW.matched_user_id IS NULL OR OLD.matched_user_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  FOR v_entry IN
    SELECT *
    FROM public.external_member_wishes
    WHERE guild_id = NEW.guild_id
      AND roster_cache_id = NEW.id
  LOOP
    UPDATE public.class_wishes
    SET class_id = v_entry.class_id,
        spec_ids = COALESCE(v_entry.spec_ids, ARRAY[]::TEXT[]),
        spec_order = COALESCE(v_entry.spec_order, ARRAY[]::TEXT[]),
        comment = v_entry.comment,
        validation_status = COALESCE(v_entry.validation_status, 'approved'),
        validated_by = v_entry.validated_by,
        validated_at = COALESCE(v_entry.validated_at, now()),
        updated_at = now()
    WHERE guild_id = v_entry.guild_id
      AND roster_id = v_entry.roster_id
      AND user_id = NEW.matched_user_id
      AND choice_index = v_entry.choice_index;

    IF NOT FOUND THEN
      INSERT INTO public.class_wishes (
        guild_id,
        roster_id,
        user_id,
        choice_index,
        class_id,
        spec_ids,
        spec_order,
        comment,
        validation_status,
        validated_by,
        validated_at
      ) VALUES (
        v_entry.guild_id,
        v_entry.roster_id,
        NEW.matched_user_id,
        v_entry.choice_index,
        v_entry.class_id,
        COALESCE(v_entry.spec_ids, ARRAY[]::TEXT[]),
        COALESCE(v_entry.spec_order, ARRAY[]::TEXT[]),
        v_entry.comment,
        COALESCE(v_entry.validation_status, 'approved'),
        v_entry.validated_by,
        COALESCE(v_entry.validated_at, now())
      );
    END IF;
  END LOOP;

  DELETE FROM public.external_member_wishes
  WHERE guild_id = NEW.guild_id
    AND roster_cache_id = NEW.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_transfer_external_wishes_to_matched_user ON public.guild_roster_cache;
CREATE TRIGGER trigger_transfer_external_wishes_to_matched_user
AFTER UPDATE OF matched_user_id ON public.guild_roster_cache
FOR EACH ROW
WHEN (OLD.matched_user_id IS DISTINCT FROM NEW.matched_user_id)
EXECUTE FUNCTION public.transfer_external_wishes_to_matched_user();
