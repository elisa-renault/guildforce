-- Guild vault: encrypted shared secrets with per-secret access control and audit trails

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
    'view_vault_audit'
  )
);

CREATE TABLE IF NOT EXISTS public.guild_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  service_name TEXT NOT NULL,
  secret_kind TEXT NOT NULL,
  service_url TEXT,
  login_identifier_hint TEXT,
  description TEXT,
  requires_reason BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  updated_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT guild_secrets_secret_kind_check CHECK (
    secret_kind IN ('credential', 'token', 'note', 'recovery_code')
  )
);

CREATE TABLE IF NOT EXISTS public.guild_secret_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  secret_id UUID NOT NULL REFERENCES public.guild_secrets(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  encrypted_payload TEXT NOT NULL,
  iv TEXT NOT NULL,
  key_version TEXT NOT NULL,
  preview_mask TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT guild_secret_versions_version_number_check CHECK (version_number > 0)
);

CREATE TABLE IF NOT EXISTS public.guild_secret_access_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  secret_id UUID NOT NULL REFERENCES public.guild_secrets(id) ON DELETE CASCADE,
  capability TEXT NOT NULL,
  access_type TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  min_rank_index INTEGER,
  max_rank_index INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT guild_secret_access_rules_capability_check CHECK (
    capability IN ('metadata', 'reveal', 'manage', 'audit')
  ),
  CONSTRAINT guild_secret_access_rules_access_type_check CHECK (
    access_type IN ('user', 'rank')
  ),
  CONSTRAINT guild_secret_access_rules_user_requires_id_check CHECK (
    access_type <> 'user' OR user_id IS NOT NULL
  ),
  CONSTRAINT guild_secret_access_rules_rank_requires_max_check CHECK (
    access_type <> 'rank' OR max_rank_index IS NOT NULL
  )
);

CREATE TABLE IF NOT EXISTS public.guild_secret_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
  secret_id UUID NOT NULL REFERENCES public.guild_secrets(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  action_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT guild_secret_audit_events_action_type_check CHECK (
    action_type IN (
      'created',
      'revealed',
      'copied',
      'rotated',
      'updated',
      'archived',
      'deleted',
      'access_denied'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_guild_secrets_guild_id
  ON public.guild_secrets(guild_id);

CREATE INDEX IF NOT EXISTS idx_guild_secrets_updated_at
  ON public.guild_secrets(updated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_guild_secret_versions_secret_version
  ON public.guild_secret_versions(secret_id, version_number);

CREATE UNIQUE INDEX IF NOT EXISTS idx_guild_secret_versions_active
  ON public.guild_secret_versions(secret_id)
  WHERE is_active;

CREATE INDEX IF NOT EXISTS idx_guild_secret_access_rules_secret_id
  ON public.guild_secret_access_rules(secret_id);

CREATE INDEX IF NOT EXISTS idx_guild_secret_access_rules_user_id
  ON public.guild_secret_access_rules(user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_guild_secret_audit_events_guild_id
  ON public.guild_secret_audit_events(guild_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_guild_secret_audit_events_secret_id
  ON public.guild_secret_audit_events(secret_id, created_at DESC);

DROP TRIGGER IF EXISTS update_guild_secrets_updated_at ON public.guild_secrets;
CREATE TRIGGER update_guild_secrets_updated_at
  BEFORE UPDATE ON public.guild_secrets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.can_access_guild_secret(
  p_secret_id UUID,
  p_user_id UUID,
  p_capability TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guild_id UUID;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF p_capability NOT IN ('metadata', 'reveal', 'manage', 'audit') THEN
    RETURN FALSE;
  END IF;

  SELECT guild_id
  INTO v_guild_id
  FROM public.guild_secrets
  WHERE id = p_secret_id;

  IF v_guild_id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF public.is_guild_gm(v_guild_id, p_user_id) THEN
    RETURN TRUE;
  END IF;

  IF public.has_guild_permission(v_guild_id, p_user_id, 'manage_vault') THEN
    RETURN TRUE;
  END IF;

  IF p_capability = 'audit'
    AND public.has_guild_permission(v_guild_id, p_user_id, 'view_vault_audit')
  THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.guild_secret_access_rules r
    WHERE r.secret_id = p_secret_id
      AND r.capability = p_capability
      AND (
        (r.access_type = 'user' AND r.user_id = p_user_id)
        OR
        (
          r.access_type = 'rank'
          AND EXISTS (
            SELECT 1
            FROM public.guilds g
            JOIN public.wow_guild_memberships wgm
              ON wgm.user_id = p_user_id
             AND LOWER(wgm.guild_name) = LOWER(g.name)
             AND (
               LOWER(wgm.guild_realm_slug) = LOWER(g.server)
               OR LOWER(wgm.guild_realm) = LOWER(g.server)
             )
             AND UPPER(wgm.guild_region) = UPPER(g.region)
            WHERE g.id = v_guild_id
              AND wgm.rank_index >= COALESCE(r.min_rank_index, 0)
              AND wgm.rank_index <= r.max_rank_index
          )
        )
      )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.has_any_guild_secret_access(
  p_guild_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF public.is_guild_gm(p_guild_id, p_user_id) THEN
    RETURN TRUE;
  END IF;

  IF public.has_guild_permission(p_guild_id, p_user_id, 'manage_vault') THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.guild_secrets s
    WHERE s.guild_id = p_guild_id
      AND NOT s.is_archived
      AND public.can_access_guild_secret(s.id, p_user_id, 'metadata')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.list_visible_guild_secrets(
  p_guild_id UUID
)
RETURNS TABLE (
  id UUID,
  label TEXT,
  service_name TEXT,
  secret_kind TEXT,
  service_url TEXT,
  login_identifier_hint TEXT,
  description TEXT,
  preview_mask TEXT,
  requires_reason BOOLEAN,
  can_reveal BOOLEAN,
  can_manage BOOLEAN,
  can_audit BOOLEAN,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID;
BEGIN
  v_actor := auth.uid();

  IF v_actor IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    s.id,
    s.label,
    s.service_name,
    s.secret_kind,
    s.service_url,
    s.login_identifier_hint,
    s.description,
    COALESCE(v.preview_mask, ''),
    s.requires_reason,
    public.can_access_guild_secret(s.id, v_actor, 'reveal'),
    public.can_access_guild_secret(s.id, v_actor, 'manage'),
    public.can_access_guild_secret(s.id, v_actor, 'audit'),
    s.updated_at
  FROM public.guild_secrets s
  LEFT JOIN LATERAL (
    SELECT preview_mask
    FROM public.guild_secret_versions
    WHERE secret_id = s.id
      AND is_active
    ORDER BY version_number DESC
    LIMIT 1
  ) v ON TRUE
  WHERE s.guild_id = p_guild_id
    AND NOT s.is_archived
    AND public.can_access_guild_secret(s.id, v_actor, 'metadata')
  ORDER BY s.updated_at DESC, s.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_guild_secret_audit(
  p_guild_id UUID,
  p_secret_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  guild_id UUID,
  secret_id UUID,
  secret_label TEXT,
  actor_user_id UUID,
  action_type TEXT,
  action_context JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID;
BEGIN
  v_actor := auth.uid();

  IF v_actor IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    e.id,
    e.guild_id,
    e.secret_id,
    s.label,
    e.actor_user_id,
    e.action_type,
    e.action_context,
    e.created_at
  FROM public.guild_secret_audit_events e
  JOIN public.guild_secrets s
    ON s.id = e.secret_id
  WHERE e.guild_id = p_guild_id
    AND (p_secret_id IS NULL OR e.secret_id = p_secret_id)
    AND public.can_access_guild_secret(e.secret_id, v_actor, 'audit')
  ORDER BY e.created_at DESC;
END;
$$;

ALTER TABLE public.guild_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guild_secret_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guild_secret_access_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guild_secret_audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guild secret viewers can read metadata"
ON public.guild_secrets
FOR SELECT
USING (public.can_access_guild_secret(id, auth.uid(), 'metadata'));

CREATE POLICY "Vault managers can create secrets"
ON public.guild_secrets
FOR INSERT
WITH CHECK (
  public.is_guild_gm(guild_id, auth.uid())
  OR public.has_guild_permission(guild_id, auth.uid(), 'manage_vault')
);

CREATE POLICY "Vault managers can update secrets"
ON public.guild_secrets
FOR UPDATE
USING (public.can_access_guild_secret(id, auth.uid(), 'manage'))
WITH CHECK (public.can_access_guild_secret(id, auth.uid(), 'manage'));

CREATE POLICY "Vault managers can delete secrets"
ON public.guild_secrets
FOR DELETE
USING (public.can_access_guild_secret(id, auth.uid(), 'manage'));

CREATE POLICY "Guild secret viewers can read access rules"
ON public.guild_secret_access_rules
FOR SELECT
USING (public.can_access_guild_secret(secret_id, auth.uid(), 'metadata'));

CREATE POLICY "Vault managers can insert access rules"
ON public.guild_secret_access_rules
FOR INSERT
WITH CHECK (public.can_access_guild_secret(secret_id, auth.uid(), 'manage'));

CREATE POLICY "Vault managers can update access rules"
ON public.guild_secret_access_rules
FOR UPDATE
USING (public.can_access_guild_secret(secret_id, auth.uid(), 'manage'))
WITH CHECK (public.can_access_guild_secret(secret_id, auth.uid(), 'manage'));

CREATE POLICY "Vault managers can delete access rules"
ON public.guild_secret_access_rules
FOR DELETE
USING (public.can_access_guild_secret(secret_id, auth.uid(), 'manage'));

CREATE POLICY "Vault auditors can read secret audit"
ON public.guild_secret_audit_events
FOR SELECT
USING (public.can_access_guild_secret(secret_id, auth.uid(), 'audit'));
