-- Create enum for poll status
CREATE TYPE poll_status AS ENUM ('draft', 'active', 'closed');

-- Create enum for question types
CREATE TYPE poll_question_type AS ENUM ('single_choice', 'multiple_choice', 'text', 'rating');

-- Create guild_polls table
CREATE TABLE public.guild_polls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guild_id UUID NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
  roster_id UUID REFERENCES public.rosters(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  allow_multiple_responses BOOLEAN NOT NULL DEFAULT false,
  status poll_status NOT NULL DEFAULT 'draft',
  starts_at TIMESTAMP WITH TIME ZONE,
  ends_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create guild_poll_questions table
CREATE TABLE public.guild_poll_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES public.guild_polls(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type poll_question_type NOT NULL DEFAULT 'single_choice',
  is_required BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  options JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create guild_poll_responses table
CREATE TABLE public.guild_poll_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.guild_poll_questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  response_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(question_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_guild_polls_guild_id ON public.guild_polls(guild_id);
CREATE INDEX idx_guild_polls_status ON public.guild_polls(status);
CREATE INDEX idx_guild_poll_questions_poll_id ON public.guild_poll_questions(poll_id);
CREATE INDEX idx_guild_poll_responses_question_id ON public.guild_poll_responses(question_id);
CREATE INDEX idx_guild_poll_responses_user_id ON public.guild_poll_responses(user_id);

-- Enable RLS
ALTER TABLE public.guild_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guild_poll_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guild_poll_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for guild_polls

-- Anyone in the guild can view active polls
CREATE POLICY "Guild members can view active polls"
ON public.guild_polls
FOR SELECT
USING (
  status = 'active' AND
  EXISTS (
    SELECT 1 FROM public.guild_members gm
    WHERE gm.guild_id = guild_polls.guild_id
    AND gm.user_id = auth.uid()
    AND gm.status = 'confirmed'
  )
);

-- GM can view all polls (including drafts and closed)
CREATE POLICY "GM can view all polls"
ON public.guild_polls
FOR SELECT
USING (is_guild_gm(guild_id, auth.uid()));

-- GM can create polls
CREATE POLICY "GM can create polls"
ON public.guild_polls
FOR INSERT
WITH CHECK (is_guild_gm(guild_id, auth.uid()));

-- GM can update their guild's polls
CREATE POLICY "GM can update polls"
ON public.guild_polls
FOR UPDATE
USING (is_guild_gm(guild_id, auth.uid()));

-- GM can delete their guild's polls
CREATE POLICY "GM can delete polls"
ON public.guild_polls
FOR DELETE
USING (is_guild_gm(guild_id, auth.uid()));

-- RLS Policies for guild_poll_questions

-- Anyone who can see the poll can see its questions
CREATE POLICY "Users can view questions of visible polls"
ON public.guild_poll_questions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.guild_polls gp
    WHERE gp.id = guild_poll_questions.poll_id
    AND (
      (gp.status = 'active' AND EXISTS (
        SELECT 1 FROM public.guild_members gm
        WHERE gm.guild_id = gp.guild_id
        AND gm.user_id = auth.uid()
        AND gm.status = 'confirmed'
      ))
      OR
      is_guild_gm(gp.guild_id, auth.uid())
    )
  )
);

-- GM can manage questions
CREATE POLICY "GM can insert questions"
ON public.guild_poll_questions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.guild_polls gp
    WHERE gp.id = guild_poll_questions.poll_id
    AND is_guild_gm(gp.guild_id, auth.uid())
  )
);

CREATE POLICY "GM can update questions"
ON public.guild_poll_questions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.guild_polls gp
    WHERE gp.id = guild_poll_questions.poll_id
    AND is_guild_gm(gp.guild_id, auth.uid())
  )
);

CREATE POLICY "GM can delete questions"
ON public.guild_poll_questions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.guild_polls gp
    WHERE gp.id = guild_poll_questions.poll_id
    AND is_guild_gm(gp.guild_id, auth.uid())
  )
);

-- RLS Policies for guild_poll_responses

-- Users can insert their own responses to active polls
CREATE POLICY "Users can submit responses to active polls"
ON public.guild_poll_responses
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.guild_poll_questions gpq
    JOIN public.guild_polls gp ON gp.id = gpq.poll_id
    JOIN public.guild_members gm ON gm.guild_id = gp.guild_id
    WHERE gpq.id = guild_poll_responses.question_id
    AND gp.status = 'active'
    AND gm.user_id = auth.uid()
    AND gm.status = 'confirmed'
  )
);

-- Users can view their own responses
CREATE POLICY "Users can view their own responses"
ON public.guild_poll_responses
FOR SELECT
USING (user_id = auth.uid());

-- GM can view all responses
CREATE POLICY "GM can view all responses"
ON public.guild_poll_responses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.guild_poll_questions gpq
    JOIN public.guild_polls gp ON gp.id = gpq.poll_id
    WHERE gpq.id = guild_poll_responses.question_id
    AND is_guild_gm(gp.guild_id, auth.uid())
  )
);

-- Users can update their own responses (if poll is still active)
CREATE POLICY "Users can update their own responses"
ON public.guild_poll_responses
FOR UPDATE
USING (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.guild_poll_questions gpq
    JOIN public.guild_polls gp ON gp.id = gpq.poll_id
    WHERE gpq.id = guild_poll_responses.question_id
    AND gp.status = 'active'
  )
);

-- Users can delete their own responses
CREATE POLICY "Users can delete their own responses"
ON public.guild_poll_responses
FOR DELETE
USING (user_id = auth.uid());

-- Create trigger for updated_at on guild_polls
CREATE TRIGGER update_guild_polls_updated_at
BEFORE UPDATE ON public.guild_polls
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();