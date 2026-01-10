-- Add Battle.net fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS battlenet_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS battlenet_token TEXT,
ADD COLUMN IF NOT EXISTS battlenet_token_expires_at TIMESTAMP WITH TIME ZONE;

-- Create wow_characters table
CREATE TABLE public.wow_characters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  realm TEXT NOT NULL,
  realm_slug TEXT NOT NULL,
  class_id INTEGER NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  guild_name TEXT,
  guild_realm TEXT,
  is_main BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, name, realm_slug)
);

-- Enable RLS on wow_characters
ALTER TABLE public.wow_characters ENABLE ROW LEVEL SECURITY;

-- Users can view their own characters
CREATE POLICY "Users can view their own characters"
ON public.wow_characters
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own characters
CREATE POLICY "Users can insert their own characters"
ON public.wow_characters
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own characters
CREATE POLICY "Users can update their own characters"
ON public.wow_characters
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own characters
CREATE POLICY "Users can delete their own characters"
ON public.wow_characters
FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_wow_characters_updated_at
BEFORE UPDATE ON public.wow_characters
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();