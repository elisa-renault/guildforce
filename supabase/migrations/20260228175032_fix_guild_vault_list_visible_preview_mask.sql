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
    COALESCE(v.active_preview_mask, ''),
    s.requires_reason,
    public.can_access_guild_secret(s.id, v_actor, 'reveal'),
    public.can_access_guild_secret(s.id, v_actor, 'manage'),
    public.can_access_guild_secret(s.id, v_actor, 'audit'),
    s.updated_at
  FROM public.guild_secrets s
  LEFT JOIN LATERAL (
    SELECT gsv.preview_mask AS active_preview_mask
    FROM public.guild_secret_versions gsv
    WHERE gsv.secret_id = s.id
      AND gsv.is_active
    ORDER BY gsv.version_number DESC
    LIMIT 1
  ) v ON TRUE
  WHERE s.guild_id = p_guild_id
    AND NOT s.is_archived
    AND public.can_access_guild_secret(s.id, v_actor, 'metadata')
  ORDER BY s.updated_at DESC, s.created_at DESC;
END;
$$;
