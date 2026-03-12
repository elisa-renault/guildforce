-- Cache GM-triggered AI summaries for closed poll text questions.

CREATE TABLE IF NOT EXISTS public.poll_question_ai_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.guild_polls(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.guild_poll_questions(id) ON DELETE CASCADE,
  locale TEXT NOT NULL CHECK (locale IN ('en', 'fr', 'de', 'ru')),
  model_name TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  source_hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ready', 'insufficient_data', 'unavailable')),
  comment_count INTEGER NOT NULL DEFAULT 0 CHECK (comment_count >= 0),
  summary_payload JSONB,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  generated_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT poll_question_ai_summaries_question_locale_key UNIQUE (question_id, locale)
);

CREATE INDEX IF NOT EXISTS idx_poll_question_ai_summaries_poll_id
  ON public.poll_question_ai_summaries(poll_id);

CREATE INDEX IF NOT EXISTS idx_poll_question_ai_summaries_question_locale
  ON public.poll_question_ai_summaries(question_id, locale);

DROP TRIGGER IF EXISTS update_poll_question_ai_summaries_updated_at
  ON public.poll_question_ai_summaries;

CREATE TRIGGER update_poll_question_ai_summaries_updated_at
BEFORE UPDATE ON public.poll_question_ai_summaries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.poll_question_ai_summaries ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.poll_question_ai_summaries FROM anon, authenticated;
REVOKE ALL ON public.poll_question_ai_summaries FROM PUBLIC;

COMMENT ON TABLE public.poll_question_ai_summaries IS
  'Server-managed cache for GM-triggered AI summaries of closed poll text questions.';

COMMENT ON COLUMN public.poll_question_ai_summaries.summary_payload IS
  'Structured AI summary payload. Null when generation failed or the question lacks enough written comments.';
