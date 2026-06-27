WITH chaos_nova AS (
  SELECT id
  FROM public.composition_abilities
  WHERE ability_key = 'chaos_nova_aoe_stun'
)
DELETE FROM public.composition_ability_mappings mappings
USING chaos_nova
WHERE mappings.ability_id = chaos_nova.id
  AND mappings.class_id = 'demon-hunter'
  AND mappings.spec_id IS NULL
  AND mappings.role IS NULL;

WITH seed_mappings (
  ability_key,
  class_id,
  spec_id
) AS (
  VALUES
    ('chaos_nova_aoe_stun', 'demon-hunter', 'dh-havoc'),
    ('chaos_nova_aoe_stun', 'demon-hunter', 'dh-vengeance')
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
