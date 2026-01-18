-- Security hardening: avoid permissive INSERT policy on bug_reports
-- Bug reports should be created either by authenticated users (direct) or via the backend function (service role).

DROP POLICY IF EXISTS "Anyone can create bug reports" ON public.bug_reports;

CREATE POLICY "Users can create their own bug reports"
ON public.bug_reports
FOR INSERT
WITH CHECK (auth.uid() = reporter_id);
