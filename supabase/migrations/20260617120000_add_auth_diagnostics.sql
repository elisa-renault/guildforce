-- Lightweight OAuth diagnostics for short-lived authentication troubleshooting.
-- OAuth codes, access tokens, refresh tokens, raw state values, and passwords must
-- never be written to this table.

CREATE TABLE IF NOT EXISTS public.auth_diagnostics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id text NOT NULL,
  user_id uuid,
  provider text NOT NULL DEFAULT 'battlenet',
  step text NOT NULL,
  status text NOT NULL,
  browser text,
  url_path text,
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT auth_diagnostics_provider_check
    CHECK (provider IN ('battlenet')),
  CONSTRAINT auth_diagnostics_status_check
    CHECK (status IN ('ok', 'warning', 'error'))
);

CREATE INDEX IF NOT EXISTS idx_auth_diagnostics_flow_id
  ON public.auth_diagnostics (flow_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_diagnostics_created_at
  ON public.auth_diagnostics (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_diagnostics_user_id
  ON public.auth_diagnostics (user_id)
  WHERE user_id IS NOT NULL;

ALTER TABLE public.auth_diagnostics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins and moderators can read auth diagnostics" ON public.auth_diagnostics;
CREATE POLICY "Admins and moderators can read auth diagnostics"
ON public.auth_diagnostics
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'moderator'::public.app_role)
);

COMMENT ON TABLE public.auth_diagnostics IS
  'Short-lived sanitized authentication diagnostics for Battle.net OAuth troubleshooting.';

COMMENT ON COLUMN public.auth_diagnostics.metadata IS
  'Sanitized JSON metadata only. Do not store OAuth codes, tokens, raw state, passwords, or authorization headers.';
