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
    ('ironbark_external_defensive', 'external_defensives', 'external', 102342, 'manual', true, 180),
    ('life_cocoon_external_defensive', 'external_defensives', 'external', 116849, 'manual', true, 181),
    ('time_dilation_external_defensive', 'external_defensives', 'external', 357170, 'manual', true, 182),
    ('pain_suppression_external_defensive', 'external_defensives', 'external', 33206, 'manual', true, 183),
    ('guardian_spirit_external_defensive', 'external_defensives', 'external', 47788, 'manual', true, 184),
    ('blessing_of_sacrifice_external_defensive', 'external_defensives', 'external', 6940, 'manual', true, 185),
    ('intervene_external_defensive', 'external_defensives', 'external', 3411, 'manual', true, 188),

    ('power_word_barrier_raid_defensive', 'raid_defensives', 'raid_defensive', 62618, 'manual', true, 190),
    ('zephyr_raid_defensive', 'raid_defensives', 'raid_defensive', 374227, 'manual', true, 194),
    ('aura_mastery_raid_defensive', 'raid_defensives', 'raid_defensive', 31821, 'manual', true, 195),
    ('aegis_of_light_raid_defensive', 'raid_defensives', 'raid_defensive', 204150, 'manual', true, 196)
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

UPDATE public.composition_abilities
SET
  coverage_key = CASE ability_key
    WHEN 'blessing_of_protection' THEN 'external_defensives'
    WHEN 'blessing_of_spellwarding' THEN 'external_defensives'
    WHEN 'anti_magic_zone' THEN 'raid_defensives'
    WHEN 'rallying_cry' THEN 'raid_defensives'
    WHEN 'darkness' THEN 'raid_defensives'
    ELSE coverage_key
  END,
  ability_kind = CASE ability_key
    WHEN 'anti_magic_zone' THEN 'raid_defensive'
    WHEN 'rallying_cry' THEN 'raid_defensive'
    WHEN 'darkness' THEN 'raid_defensive'
    ELSE ability_kind
  END,
  sort_order = CASE ability_key
    WHEN 'blessing_of_protection' THEN 186
    WHEN 'blessing_of_spellwarding' THEN 187
    WHEN 'anti_magic_zone' THEN 191
    WHEN 'rallying_cry' THEN 192
    WHEN 'darkness' THEN 193
    ELSE sort_order
  END,
  updated_at = now()
WHERE ability_key IN (
  'blessing_of_protection',
  'blessing_of_spellwarding',
  'anti_magic_zone',
  'rallying_cry',
  'darkness'
);

WITH seed_mappings (
  ability_key,
  class_id,
  spec_id
) AS (
  VALUES
    ('ironbark_external_defensive', 'druid', 'druid-restoration'),
    ('life_cocoon_external_defensive', 'monk', 'monk-mistweaver'),
    ('time_dilation_external_defensive', 'evoker', 'evoker-preservation'),
    ('pain_suppression_external_defensive', 'priest', 'priest-discipline'),
    ('guardian_spirit_external_defensive', 'priest', 'priest-holy'),
    ('blessing_of_sacrifice_external_defensive', 'paladin', NULL),
    ('intervene_external_defensive', 'warrior', NULL),

    ('power_word_barrier_raid_defensive', 'priest', 'priest-discipline'),
    ('zephyr_raid_defensive', 'evoker', NULL),
    ('aura_mastery_raid_defensive', 'paladin', 'paladin-holy'),
    ('aegis_of_light_raid_defensive', 'paladin', 'paladin-protection')
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
