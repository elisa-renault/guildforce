WITH seed_spells (
  spell_id,
  name_en,
  name_fr
) AS (
  VALUES
    (102342, 'Ironbark', 'Écorcefer'),
    (116849, 'Life Cocoon', 'Cocon de vie'),
    (357170, 'Time Dilation', 'Dilatation temporelle'),
    (33206, 'Pain Suppression', 'Suppression de la douleur'),
    (47788, 'Guardian Spirit', 'Esprit gardien'),
    (6940, 'Blessing of Sacrifice', 'Bénédiction de sacrifice'),
    (3411, 'Intervene', 'Intervention'),
    (62618, 'Power Word: Barrier', 'Mot de pouvoir : Barrière'),
    (31821, 'Aura Mastery', 'Maîtrise des auras'),
    (204150, 'Aegis of Light', 'Égide de lumière')
)
INSERT INTO public.wow_spells (
  spell_id,
  name_en,
  name_fr,
  updated_at
)
SELECT
  spell_id,
  name_en,
  name_fr,
  now()
FROM seed_spells
ON CONFLICT (spell_id) DO UPDATE
SET
  name_en = COALESCE(public.wow_spells.name_en, EXCLUDED.name_en),
  name_fr = COALESCE(public.wow_spells.name_fr, EXCLUDED.name_fr),
  updated_at = now();
