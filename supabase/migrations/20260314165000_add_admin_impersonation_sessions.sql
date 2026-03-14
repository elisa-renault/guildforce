CREATE TABLE public.admin_impersonation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_username TEXT NULL,
  target_email TEXT NULL,
  start_path TEXT NULL,
  restore_path TEXT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  ended_at TIMESTAMPTZ NULL,
  CONSTRAINT admin_impersonation_sessions_actor_target_check CHECK (actor_user_id <> target_user_id)
);

CREATE INDEX idx_admin_impersonation_sessions_actor_started_at
  ON public.admin_impersonation_sessions (actor_user_id, started_at DESC);

CREATE INDEX idx_admin_impersonation_sessions_target_started_at
  ON public.admin_impersonation_sessions (target_user_id, started_at DESC);

ALTER TABLE public.admin_impersonation_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read impersonation sessions"
ON public.admin_impersonation_sessions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

COMMENT ON TABLE public.admin_impersonation_sessions
IS 'Audit trail for global admin user impersonation sessions.';
