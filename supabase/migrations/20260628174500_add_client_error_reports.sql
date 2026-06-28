-- Persist user-visible client errors so admins can review failures after users see
-- destructive toasts.

CREATE TABLE IF NOT EXISTS public.client_error_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  toast_title TEXT NOT NULL,
  toast_description TEXT,
  route_path TEXT,
  route_url TEXT,
  user_agent TEXT,
  locale TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolution_note TEXT,
  CONSTRAINT client_error_reports_status_check
    CHECK (status IN ('open', 'investigating', 'resolved', 'closed', 'wontfix'))
);

CREATE INDEX IF NOT EXISTS idx_client_error_reports_status
  ON public.client_error_reports(status);

CREATE INDEX IF NOT EXISTS idx_client_error_reports_created_at
  ON public.client_error_reports(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_error_reports_user_id
  ON public.client_error_reports(user_id, created_at DESC);

ALTER TABLE public.client_error_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins and moderators can view client error reports" ON public.client_error_reports;
CREATE POLICY "Admins and moderators can view client error reports"
ON public.client_error_reports
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'moderator')
);

DROP POLICY IF EXISTS "Admins and moderators can update client error reports" ON public.client_error_reports;
CREATE POLICY "Admins and moderators can update client error reports"
ON public.client_error_reports
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'moderator')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'moderator')
);

DROP POLICY IF EXISTS "Admins can delete client error reports" ON public.client_error_reports;
CREATE POLICY "Admins can delete client error reports"
ON public.client_error_reports
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.log_client_error_report(
  p_toast_title TEXT,
  p_toast_description TEXT DEFAULT NULL,
  p_route_path TEXT DEFAULT NULL,
  p_route_url TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_locale TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_report_id UUID;
  v_title TEXT := NULLIF(left(COALESCE(p_toast_title, ''), 500), '');
BEGIN
  IF v_title IS NULL THEN
    v_title := 'Client error';
  END IF;

  INSERT INTO public.client_error_reports (
    user_id,
    toast_title,
    toast_description,
    route_path,
    route_url,
    user_agent,
    locale,
    metadata
  )
  VALUES (
    v_actor,
    v_title,
    NULLIF(left(COALESCE(p_toast_description, ''), 2000), ''),
    NULLIF(left(COALESCE(p_route_path, ''), 500), ''),
    NULLIF(left(COALESCE(p_route_url, ''), 2000), ''),
    NULLIF(left(COALESCE(p_user_agent, ''), 1000), ''),
    NULLIF(left(COALESCE(p_locale, ''), 64), ''),
    COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_report_id;

  RETURN v_report_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_client_error_report(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO anon, authenticated;
