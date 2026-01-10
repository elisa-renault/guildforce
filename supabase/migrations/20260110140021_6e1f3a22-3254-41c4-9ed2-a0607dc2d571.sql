-- Make owner_id nullable to support guilds without an owner yet
ALTER TABLE public.guilds ALTER COLUMN owner_id DROP NOT NULL;

-- Add created_by_user_id to track who initially created the guild
ALTER TABLE public.guilds ADD COLUMN created_by_user_id uuid REFERENCES auth.users(id);

-- Update RLS policies for guilds

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can create guilds" ON public.guilds;
DROP POLICY IF EXISTS "Guild owners can update their guilds" ON public.guilds;
DROP POLICY IF EXISTS "Guild owners can delete their guilds" ON public.guilds;

-- Allow any authenticated user to create a guild (for orphan guilds)
CREATE POLICY "Authenticated users can create guilds" 
ON public.guilds 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Allow owner to update, OR allow GM to claim orphan guild
CREATE POLICY "Guild owners can update their guilds" 
ON public.guilds 
FOR UPDATE 
USING (
  auth.uid() = owner_id 
  OR (owner_id IS NULL AND auth.uid() IS NOT NULL)
);

-- Only owner can delete
CREATE POLICY "Guild owners can delete their guilds" 
ON public.guilds 
FOR DELETE 
USING (auth.uid() = owner_id);