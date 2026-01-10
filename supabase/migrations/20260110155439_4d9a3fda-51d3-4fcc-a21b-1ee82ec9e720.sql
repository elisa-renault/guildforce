-- Fix guilds FK constraints to use SET NULL instead of CASCADE/NO ACTION
-- This ensures guilds are preserved when owner is deleted (becomes orphaned)

-- Drop existing constraints
ALTER TABLE guilds DROP CONSTRAINT IF EXISTS guilds_owner_id_fkey;
ALTER TABLE guilds DROP CONSTRAINT IF EXISTS guilds_created_by_user_id_fkey;

-- Recreate with ON DELETE SET NULL
ALTER TABLE guilds 
  ADD CONSTRAINT guilds_owner_id_fkey 
  FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE guilds 
  ADD CONSTRAINT guilds_created_by_user_id_fkey 
  FOREIGN KEY (created_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;