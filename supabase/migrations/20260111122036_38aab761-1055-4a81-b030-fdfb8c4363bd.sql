-- Ajouter la colonne avatar_url à la table guilds
ALTER TABLE public.guilds ADD COLUMN avatar_url TEXT;

-- Créer le bucket guild-avatars (public pour lecture)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('guild-avatars', 'guild-avatars', true);

-- Politique de lecture publique
CREATE POLICY "Guild avatars are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'guild-avatars');

-- Politique d'upload pour les GMs
CREATE POLICY "GMs can upload guild avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'guild-avatars' AND
  public.is_guild_owner_or_gm((storage.foldername(name))[1]::uuid)
);

-- Politique de mise à jour pour les GMs
CREATE POLICY "GMs can update guild avatars"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'guild-avatars' AND
  public.is_guild_owner_or_gm((storage.foldername(name))[1]::uuid)
);

-- Politique de suppression pour les GMs
CREATE POLICY "GMs can delete guild avatars"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'guild-avatars' AND
  public.is_guild_owner_or_gm((storage.foldername(name))[1]::uuid)
);