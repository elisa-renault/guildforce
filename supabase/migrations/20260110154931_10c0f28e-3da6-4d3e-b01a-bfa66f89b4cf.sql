-- 1. Supprimer les contraintes FK existantes et les recréer avec ON DELETE CASCADE

-- battlenet_tokens
ALTER TABLE battlenet_tokens DROP CONSTRAINT IF EXISTS battlenet_tokens_user_id_fkey;
ALTER TABLE battlenet_tokens DROP CONSTRAINT IF EXISTS fk_battlenet_tokens_user;
ALTER TABLE battlenet_tokens 
  ADD CONSTRAINT battlenet_tokens_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- wow_characters
ALTER TABLE wow_characters DROP CONSTRAINT IF EXISTS wow_characters_user_id_fkey;
ALTER TABLE wow_characters DROP CONSTRAINT IF EXISTS fk_wow_characters_user;
ALTER TABLE wow_characters 
  ADD CONSTRAINT wow_characters_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- wow_guild_memberships
ALTER TABLE wow_guild_memberships DROP CONSTRAINT IF EXISTS wow_guild_memberships_user_id_fkey;
ALTER TABLE wow_guild_memberships DROP CONSTRAINT IF EXISTS fk_wow_guild_memberships_user;
ALTER TABLE wow_guild_memberships 
  ADD CONSTRAINT wow_guild_memberships_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- guild_members
ALTER TABLE guild_members DROP CONSTRAINT IF EXISTS guild_members_user_id_fkey;
ALTER TABLE guild_members DROP CONSTRAINT IF EXISTS fk_guild_members_user;
ALTER TABLE guild_members 
  ADD CONSTRAINT guild_members_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- class_wishes
ALTER TABLE class_wishes DROP CONSTRAINT IF EXISTS class_wishes_user_id_fkey;
ALTER TABLE class_wishes DROP CONSTRAINT IF EXISTS fk_class_wishes_user;
ALTER TABLE class_wishes 
  ADD CONSTRAINT class_wishes_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- 2. Nettoyer les données de l'utilisateur avec battlenet_id = '411459115'

DELETE FROM battlenet_tokens WHERE user_id IN (SELECT id FROM profiles WHERE battlenet_id = '411459115');
DELETE FROM class_wishes WHERE user_id IN (SELECT id FROM profiles WHERE battlenet_id = '411459115');
DELETE FROM guild_members WHERE user_id IN (SELECT id FROM profiles WHERE battlenet_id = '411459115');
DELETE FROM wow_guild_memberships WHERE user_id IN (SELECT id FROM profiles WHERE battlenet_id = '411459115');
DELETE FROM wow_characters WHERE user_id IN (SELECT id FROM profiles WHERE battlenet_id = '411459115');

-- 3. Dissocier les guildes (owner et créateur)
UPDATE guilds SET owner_id = NULL WHERE owner_id IN (SELECT id FROM profiles WHERE battlenet_id = '411459115');
UPDATE guilds SET created_by_user_id = NULL WHERE created_by_user_id IN (SELECT id FROM profiles WHERE battlenet_id = '411459115');

-- 4. Supprimer le profil
DELETE FROM profiles WHERE battlenet_id = '411459115';