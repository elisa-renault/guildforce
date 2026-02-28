ALTER TABLE public.guild_secrets
ADD COLUMN IF NOT EXISTS illustration_url TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('guild-vault-images', 'guild-vault-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Guild vault images are publicly accessible" ON storage.objects;
CREATE POLICY "Guild vault images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'guild-vault-images');

DROP POLICY IF EXISTS "Vault managers can upload guild vault images" ON storage.objects;
CREATE POLICY "Vault managers can upload guild vault images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'guild-vault-images'
  AND (
    public.is_guild_gm((storage.foldername(name))[1]::uuid, auth.uid())
    OR public.has_guild_permission((storage.foldername(name))[1]::uuid, auth.uid(), 'manage_vault')
  )
);

DROP POLICY IF EXISTS "Vault managers can update guild vault images" ON storage.objects;
CREATE POLICY "Vault managers can update guild vault images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'guild-vault-images'
  AND (
    public.is_guild_gm((storage.foldername(name))[1]::uuid, auth.uid())
    OR public.has_guild_permission((storage.foldername(name))[1]::uuid, auth.uid(), 'manage_vault')
  )
);

DROP POLICY IF EXISTS "Vault managers can delete guild vault images" ON storage.objects;
CREATE POLICY "Vault managers can delete guild vault images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'guild-vault-images'
  AND (
    public.is_guild_gm((storage.foldername(name))[1]::uuid, auth.uid())
    OR public.has_guild_permission((storage.foldername(name))[1]::uuid, auth.uid(), 'manage_vault')
  )
);

DROP FUNCTION IF EXISTS public.list_visible_guild_secrets(UUID);

CREATE FUNCTION public.list_visible_guild_secrets(
  p_guild_id UUID
)
RETURNS TABLE (
  id UUID,
  label TEXT,
  service_name TEXT,
  secret_kind TEXT,
  illustration_url TEXT,
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
    s.illustration_url,
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
