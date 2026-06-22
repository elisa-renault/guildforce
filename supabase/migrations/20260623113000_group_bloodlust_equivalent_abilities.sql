WITH seed_abilities (
  ability_key,
  coverage_key,
  ability_kind,
  spell_id,
  source,
  active,
  sort_order
) AS (
  VALUES
    ('heroism', 'bloodlust', 'raid_utility', 32182, 'manual', true, 111),
    ('time_warp', 'bloodlust', 'raid_utility', 80353, 'manual', true, 112),
    ('primal_rage', 'bloodlust', 'raid_utility', 264667, 'manual', true, 113),
    ('fury_of_the_aspects', 'bloodlust', 'raid_utility', 390386, 'manual', true, 114)
)
INSERT INTO public.composition_abilities (
  ability_key,
  coverage_key,
  ability_kind,
  spell_id,
  source,
  active,
  sort_order
)
SELECT
  ability_key,
  coverage_key,
  ability_kind,
  spell_id,
  source,
  active,
  sort_order
FROM seed_abilities
ON CONFLICT (ability_key) DO UPDATE
SET
  coverage_key = EXCLUDED.coverage_key,
  ability_kind = EXCLUDED.ability_kind,
  spell_id = EXCLUDED.spell_id,
  source = EXCLUDED.source,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

WITH seed_mappings (
  ability_key,
  class_id,
  spec_id
) AS (
  VALUES
    ('heroism', 'shaman', NULL),
    ('time_warp', 'mage', NULL),
    ('primal_rage', 'hunter', NULL),
    ('fury_of_the_aspects', 'evoker', NULL)
)
INSERT INTO public.composition_ability_mappings (
  ability_id,
  class_id,
  spec_id,
  role,
  applies_to_main,
  applies_to_offspec_alt
)
SELECT
  abilities.id,
  mappings.class_id,
  mappings.spec_id,
  NULL,
  true,
  false
FROM seed_mappings mappings
JOIN public.composition_abilities abilities
  ON abilities.ability_key = mappings.ability_key
WHERE NOT EXISTS (
  SELECT 1
  FROM public.composition_ability_mappings existing
  WHERE existing.ability_id = abilities.id
    AND existing.class_id = mappings.class_id
    AND existing.spec_id IS NOT DISTINCT FROM mappings.spec_id
    AND existing.role IS NULL
);
