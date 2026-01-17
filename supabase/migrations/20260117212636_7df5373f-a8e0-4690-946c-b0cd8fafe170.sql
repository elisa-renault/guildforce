-- Mettre à jour les membres "confirmed" qui n'ont aucun vœu 
-- (ne pas toucher ceux en "withdrawn")
UPDATE public.guild_members gm
SET status = 'potential'
WHERE gm.status = 'confirmed'
  AND NOT EXISTS (
    SELECT 1 FROM public.class_wishes cw 
    WHERE cw.user_id = gm.user_id 
      AND cw.guild_id = gm.guild_id
      AND cw.class_id IS NOT NULL
  );