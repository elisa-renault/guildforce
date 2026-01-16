-- 1. Extend the poll_question_type enum with new types
ALTER TYPE public.poll_question_type ADD VALUE IF NOT EXISTS 'date';
ALTER TYPE public.poll_question_type ADD VALUE IF NOT EXISTS 'time';
ALTER TYPE public.poll_question_type ADD VALUE IF NOT EXISTS 'datetime';
ALTER TYPE public.poll_question_type ADD VALUE IF NOT EXISTS 'ranking';
ALTER TYPE public.poll_question_type ADD VALUE IF NOT EXISTS 'scale';

-- 2. Create poll sections table
CREATE TABLE public.guild_poll_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES public.guild_polls(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.guild_poll_sections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sections (same as poll questions)
CREATE POLICY "Guild members can view poll sections"
  ON public.guild_poll_sections
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.guild_polls p
      JOIN public.guild_members gm ON gm.guild_id = p.guild_id
      WHERE p.id = guild_poll_sections.poll_id
      AND gm.user_id = auth.uid()
      AND gm.status = 'confirmed'
    )
  );

CREATE POLICY "Poll creators can manage sections"
  ON public.guild_poll_sections
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.guild_polls p
      WHERE p.id = guild_poll_sections.poll_id
      AND p.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.guild_polls p
      WHERE p.id = guild_poll_sections.poll_id
      AND p.created_by = auth.uid()
    )
  );

CREATE POLICY "GMs can manage sections"
  ON public.guild_poll_sections
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.guild_polls p
      WHERE p.id = guild_poll_sections.poll_id
      AND public.is_guild_gm(p.guild_id, auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.guild_polls p
      WHERE p.id = guild_poll_sections.poll_id
      AND public.is_guild_gm(p.guild_id, auth.uid())
    )
  );

-- 3. Add section_id to questions table
ALTER TABLE public.guild_poll_questions 
ADD COLUMN section_id UUID REFERENCES public.guild_poll_sections(id) ON DELETE SET NULL;

-- 4. Add scale_config column for scale questions (min, max, step, labels)
ALTER TABLE public.guild_poll_questions 
ADD COLUMN scale_config JSONB DEFAULT NULL;

-- Create index for faster lookups
CREATE INDEX idx_poll_questions_section ON public.guild_poll_questions(section_id);
CREATE INDEX idx_poll_sections_poll ON public.guild_poll_sections(poll_id);