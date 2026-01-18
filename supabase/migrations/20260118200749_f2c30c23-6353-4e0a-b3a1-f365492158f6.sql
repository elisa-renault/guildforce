-- Add refresh_token column to battlenet_tokens table for future token refresh capability
ALTER TABLE public.battlenet_tokens 
ADD COLUMN IF NOT EXISTS refresh_token TEXT;