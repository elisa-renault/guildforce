UPDATE public.composition_abilities
SET
  active = false,
  updated_at = now()
WHERE ability_key = 'tremor_totem_ally_fear_charm_sleep_dispel';

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
    ('tremor_totem_ally_fear_dispel', 'ally_fear_dispels', 'raid_utility', 8143, 'manual', true, 580),
    ('berserker_shout_ally_fear_dispel', 'ally_fear_dispels', 'raid_utility', 384100, 'manual', true, 581),
    ('tremor_totem_ally_charm_sleep_dispel', 'ally_charm_sleep_dispels', 'raid_utility', 8143, 'manual', true, 582)
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
    ('tremor_totem_ally_fear_dispel', 'shaman', NULL),
    ('berserker_shout_ally_fear_dispel', 'warrior', NULL),
    ('tremor_totem_ally_charm_sleep_dispel', 'shaman', NULL)
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

INSERT INTO public.wow_spells (
  spell_id,
  name_en
)
VALUES
  (384100, 'Berserker Shout')
ON CONFLICT (spell_id) DO UPDATE
SET
  name_en = COALESCE(public.wow_spells.name_en, EXCLUDED.name_en),
  updated_at = now();
