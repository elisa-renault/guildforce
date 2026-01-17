-- Supprimer l'ancienne politique de suppression
DROP POLICY IF EXISTS "Authors and moderators can delete topics" ON forum_topics;

-- Créer la nouvelle politique corrigée
CREATE POLICY "Authors and moderators can delete topics" ON forum_topics
  FOR DELETE
  USING (
    -- L'auteur peut supprimer son propre sujet
    (auth.uid() = author_id)
    -- Les admins et modérateurs globaux de l'app peuvent tout supprimer
    OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'moderator')
    -- Les modérateurs du forum (globaux, par catégorie ou par guilde)
    OR EXISTS (
      SELECT 1 FROM forum_moderators m
      WHERE m.user_id = auth.uid()
      AND (
        -- Modérateur global du forum
        m.is_global_mod = true
        -- Modérateur de cette catégorie spécifique
        OR m.category_id = forum_topics.category_id
        -- Modérateur de la guilde à laquelle appartient la catégorie
        OR (
          m.guild_id IS NOT NULL 
          AND EXISTS (
            SELECT 1 FROM forum_categories c 
            WHERE c.id = forum_topics.category_id 
            AND c.guild_id = m.guild_id
          )
        )
      )
    )
  );