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
    ('typhoon_knock', 'knock_up_back', 'raid_utility', 132469, 'manual', true, 280),
    ('thunderstorm_knock', 'knock_up_back', 'raid_utility', 51490, 'manual', true, 281),
    ('ring_of_peace_knock', 'knock_up_back', 'raid_utility', 116844, 'manual', true, 282),
    ('wing_buffet_knock', 'knock_up_back', 'raid_utility', 357214, 'manual', true, 283),
    ('tail_swipe_knock', 'knock_up_back', 'raid_utility', 368970, 'manual', true, 284),

    ('mortal_strike', 'mortal_strike', 'raid_utility', 12294, 'manual', true, 290),
    ('wound_poison_mortal_wounds', 'mortal_strike', 'raid_utility', 8679, 'manual', true, 291),
    ('rising_sun_kick_mortal_wounds', 'mortal_strike', 'raid_utility', 107428, 'manual', true, 292),

    ('soothe', 'soothe', 'raid_utility', 2908, 'manual', true, 300),
    ('tranquilizing_shot_soothe', 'soothe', 'raid_utility', 19801, 'manual', true, 301),
    ('shiv_soothe', 'soothe', 'raid_utility', 5938, 'manual', true, 302),

    ('purge', 'purge', 'raid_utility', 370, 'manual', true, 310),
    ('dispel_magic_purge', 'purge', 'raid_utility', 528, 'manual', true, 311),
    ('spellsteal_purge', 'purge', 'raid_utility', 30449, 'manual', true, 312),
    ('consume_magic_purge', 'purge', 'raid_utility', 278326, 'manual', true, 313),

    ('power_infusion', 'power_infusion', 'external', 10060, 'manual', true, 320),
    ('shattering_throw_extra_shield_damage', 'extra_damage_to_shields', 'raid_utility', 64382, 'manual', true, 330),
    ('cheat_death', 'cheat_death', 'raid_defensive', 31230, 'manual', true, 340),
    ('cauterize_cheat_death', 'cheat_death', 'raid_defensive', 86949, 'manual', true, 341),
    ('purgatory_cheat_death', 'cheat_death', 'raid_defensive', 114556, 'manual', true, 342),
    ('last_resort_cheat_death', 'cheat_death', 'raid_defensive', 209258, 'manual', true, 343),
    ('blessing_of_spellwarding', 'blessing_of_spellwarding', 'external', 204018, 'manual', true, 350)
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
    ('typhoon_knock', 'druid', NULL),
    ('thunderstorm_knock', 'shaman', NULL),
    ('ring_of_peace_knock', 'monk', NULL),
    ('wing_buffet_knock', 'evoker', NULL),
    ('tail_swipe_knock', 'evoker', NULL),

    ('mortal_strike', 'warrior', 'warrior-arms'),
    ('wound_poison_mortal_wounds', 'rogue', NULL),
    ('rising_sun_kick_mortal_wounds', 'monk', 'monk-windwalker'),

    ('soothe', 'druid', NULL),
    ('tranquilizing_shot_soothe', 'hunter', NULL),
    ('shiv_soothe', 'rogue', NULL),

    ('purge', 'shaman', NULL),
    ('dispel_magic_purge', 'priest', NULL),
    ('spellsteal_purge', 'mage', NULL),
    ('consume_magic_purge', 'demon-hunter', NULL),

    ('power_infusion', 'priest', NULL),
    ('shattering_throw_extra_shield_damage', 'warrior', NULL),
    ('cheat_death', 'rogue', NULL),
    ('cauterize_cheat_death', 'mage', 'mage-fire'),
    ('purgatory_cheat_death', 'death-knight', 'dk-blood'),
    ('last_resort_cheat_death', 'demon-hunter', 'dh-vengeance'),
    ('blessing_of_spellwarding', 'paladin', 'paladin-protection')
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
