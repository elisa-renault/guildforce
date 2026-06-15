-- Guild Atlas: guild-scoped documentation library with lightweight governance.

ALTER TABLE public.guild_permissions
DROP CONSTRAINT IF EXISTS valid_permission_type;

ALTER TABLE public.guild_permissions
ADD CONSTRAINT valid_permission_type CHECK (
  permission_type IN (
    'manage_wishes',
    'manage_polls',
    'manage_rosters',
    'view_activity_log',
    'manage_members',
    'manage_vault',
    'view_vault_audit',
    'manage_atlas'
  )
);

CREATE TABLE IF NOT EXISTS public.guild_atlas_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  summary TEXT,
  content TEXT NOT NULL DEFAULT '',
  collection TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}'::text[],
  status TEXT NOT NULL DEFAULT 'draft',
  visibility_type TEXT NOT NULL DEFAULT 'members',
  min_rank_index INTEGER,
  roster_id UUID REFERENCES public.rosters(id) ON DELETE SET NULL,
  owner_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT guild_atlas_documents_title_not_blank CHECK (btrim(title) <> ''),
  CONSTRAINT guild_atlas_documents_slug_not_blank CHECK (btrim(slug) <> ''),
  CONSTRAINT guild_atlas_documents_status_check CHECK (status IN ('draft', 'published', 'archived')),
  CONSTRAINT guild_atlas_documents_visibility_check CHECK (visibility_type IN ('members', 'rank', 'roster', 'officers')),
  CONSTRAINT guild_atlas_documents_rank_visibility_check CHECK (visibility_type <> 'rank' OR min_rank_index IS NOT NULL),
  CONSTRAINT guild_atlas_documents_roster_visibility_check CHECK (visibility_type <> 'roster' OR roster_id IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_guild_atlas_documents_guild_slug
  ON public.guild_atlas_documents(guild_id, slug);

CREATE INDEX IF NOT EXISTS idx_guild_atlas_documents_guild_status
  ON public.guild_atlas_documents(guild_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_guild_atlas_documents_collection
  ON public.guild_atlas_documents(guild_id, collection);

CREATE INDEX IF NOT EXISTS idx_guild_atlas_documents_tags
  ON public.guild_atlas_documents USING gin(tags);

DROP TRIGGER IF EXISTS update_guild_atlas_documents_updated_at ON public.guild_atlas_documents;
CREATE TRIGGER update_guild_atlas_documents_updated_at
  BEFORE UPDATE ON public.guild_atlas_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.can_manage_guild_atlas(
  p_guild_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT
    p_user_id IS NOT NULL
    AND (
      public.is_guild_gm(p_guild_id, p_user_id)
      OR public.has_guild_permission(p_guild_id, p_user_id, 'manage_atlas')
    );
$$;

INSERT INTO storage.buckets (id, name, public)
VALUES ('guild-atlas-images', 'guild-atlas-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Guild Atlas images are publicly accessible" ON storage.objects;
CREATE POLICY "Guild Atlas images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'guild-atlas-images');

DROP POLICY IF EXISTS "Atlas managers can upload guild Atlas images" ON storage.objects;
CREATE POLICY "Atlas managers can upload guild Atlas images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'guild-atlas-images'
  AND public.can_manage_guild_atlas((storage.foldername(name))[1]::uuid, auth.uid())
);

DROP POLICY IF EXISTS "Atlas managers can update guild Atlas images" ON storage.objects;
CREATE POLICY "Atlas managers can update guild Atlas images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'guild-atlas-images'
  AND public.can_manage_guild_atlas((storage.foldername(name))[1]::uuid, auth.uid())
);

DROP POLICY IF EXISTS "Atlas managers can delete guild Atlas images" ON storage.objects;
CREATE POLICY "Atlas managers can delete guild Atlas images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'guild-atlas-images'
  AND public.can_manage_guild_atlas((storage.foldername(name))[1]::uuid, auth.uid())
);

CREATE OR REPLACE FUNCTION public.get_user_guild_rank_index(
  p_guild_id UUID,
  p_user_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_rank INTEGER;
BEGIN
  IF p_guild_id IS NULL OR p_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT MIN(grc.rank_index)
  INTO v_rank
  FROM public.guild_roster_cache grc
  WHERE grc.guild_id = p_guild_id
    AND grc.matched_user_id = p_user_id;

  IF v_rank IS NOT NULL THEN
    RETURN v_rank;
  END IF;

  SELECT MIN(wgm.rank_index)
  INTO v_rank
  FROM public.wow_guild_memberships wgm
  JOIN public.guilds g
    ON g.id = p_guild_id
   AND lower(wgm.guild_name) = lower(g.name)
   AND lower(coalesce(wgm.guild_region, 'eu')) = lower(coalesce(g.region, 'eu'))
   AND (
     lower(wgm.guild_realm_slug) = lower(g.server)
     OR lower(wgm.guild_realm) = lower(g.server)
   )
  WHERE wgm.user_id = p_user_id;

  RETURN v_rank;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_view_guild_atlas_document(
  p_document_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_doc public.guild_atlas_documents%ROWTYPE;
  v_rank INTEGER;
  v_officer_threshold INTEGER;
BEGIN
  IF p_document_id IS NULL OR p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT *
  INTO v_doc
  FROM public.guild_atlas_documents
  WHERE id = p_document_id;

  IF v_doc.id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF public.can_manage_guild_atlas(v_doc.guild_id, p_user_id) THEN
    RETURN TRUE;
  END IF;

  IF v_doc.status <> 'published' THEN
    RETURN FALSE;
  END IF;

  IF NOT public.is_guild_member(v_doc.guild_id, p_user_id) THEN
    RETURN FALSE;
  END IF;

  IF v_doc.visibility_type = 'members' THEN
    RETURN TRUE;
  END IF;

  IF v_doc.visibility_type = 'roster' THEN
    RETURN v_doc.roster_id IS NOT NULL
      AND public.has_roster_access(v_doc.roster_id, p_user_id);
  END IF;

  v_rank := public.get_user_guild_rank_index(v_doc.guild_id, p_user_id);

  IF v_doc.visibility_type = 'rank' THEN
    RETURN v_rank IS NOT NULL
      AND v_doc.min_rank_index IS NOT NULL
      AND v_rank <= v_doc.min_rank_index;
  END IF;

  IF v_doc.visibility_type = 'officers' THEN
    SELECT COALESCE(officer_rank_threshold, 2)
    INTO v_officer_threshold
    FROM public.guilds
    WHERE id = v_doc.guild_id;

    RETURN v_rank IS NOT NULL
      AND v_rank <= COALESCE(v_officer_threshold, 2);
  END IF;

  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_guild_atlas_document_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'atlas_doc_created';
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'archived' AND NEW.status IS DISTINCT FROM OLD.status THEN
      v_action := 'atlas_doc_restored';
    ELSIF NEW.status = 'published' AND OLD.status IS DISTINCT FROM NEW.status THEN
      v_action := 'atlas_doc_published';
    ELSIF NEW.status = 'archived' AND OLD.status IS DISTINCT FROM NEW.status THEN
      v_action := 'atlas_doc_archived';
    ELSIF OLD.visibility_type IS DISTINCT FROM NEW.visibility_type
      OR OLD.min_rank_index IS DISTINCT FROM NEW.min_rank_index
      OR OLD.roster_id IS DISTINCT FROM NEW.roster_id
    THEN
      v_action := 'atlas_doc_visibility_updated';
    ELSE
      v_action := 'atlas_doc_updated';
    END IF;
  ELSE
    RETURN NULL;
  END IF;

  PERFORM public.log_guild_activity(
    NEW.guild_id,
    COALESCE(NEW.updated_by, NEW.created_by, auth.uid()),
    v_action,
    jsonb_build_object(
      'document_id', NEW.id,
      'title', NEW.title,
      'status', NEW.status,
      'collection', NEW.collection,
      'visibility_type', NEW.visibility_type
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_guild_atlas_document_activity ON public.guild_atlas_documents;
CREATE TRIGGER log_guild_atlas_document_activity
  AFTER INSERT OR UPDATE ON public.guild_atlas_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.log_guild_atlas_document_activity();

ALTER TABLE public.guild_atlas_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guild Atlas documents are visible through Atlas access rules"
ON public.guild_atlas_documents
FOR SELECT
USING (public.can_view_guild_atlas_document(id, auth.uid()));

CREATE POLICY "Guild Atlas managers can create documents"
ON public.guild_atlas_documents
FOR INSERT
WITH CHECK (public.can_manage_guild_atlas(guild_id, auth.uid()));

CREATE POLICY "Guild Atlas managers can update documents"
ON public.guild_atlas_documents
FOR UPDATE
USING (public.can_manage_guild_atlas(guild_id, auth.uid()))
WITH CHECK (public.can_manage_guild_atlas(guild_id, auth.uid()));

CREATE POLICY "Guild Atlas managers can delete documents"
ON public.guild_atlas_documents
FOR DELETE
USING (public.can_manage_guild_atlas(guild_id, auth.uid()));

COMMENT ON TABLE public.guild_atlas_documents
  IS 'Guild-scoped documentation library for the Guild Atlas module.';
