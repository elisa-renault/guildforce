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
    ('rebirth', 'combat_res', 'raid_utility', 20484, 'manual', true, 120),
    ('raise_ally', 'combat_res', 'raid_utility', 61999, 'manual', true, 121),
    ('soulstone', 'combat_res', 'raid_utility', 20707, 'manual', true, 122),
    ('intercession', 'combat_res', 'raid_utility', 391054, 'manual', true, 123),
    ('return_evoker', 'combat_res', 'raid_utility', 361227, 'manual', true, 124),

    ('stampeding_roar', 'burst_move_speed', 'raid_utility', 106898, 'manual', true, 130),
    ('wind_rush_totem', 'burst_move_speed', 'raid_utility', 192077, 'manual', true, 131),
    ('zephyr', 'burst_move_speed', 'raid_utility', 374227, 'manual', true, 132),

    ('demonic_gateway', 'warlock_utility', 'raid_utility', 111771, 'manual', true, 140),
    ('soulwell', 'warlock_utility', 'raid_utility', 29893, 'manual', true, 141),
    ('curse_of_tongues_warlock_utility', 'warlock_utility', 'raid_utility', 1714, 'manual', true, 142),
    ('curse_of_weakness_warlock_utility', 'warlock_utility', 'raid_utility', 702, 'manual', true, 143),

    ('mass_dispel', 'mass_dispel', 'raid_utility', 32375, 'manual', true, 150),
    ('innervate', 'innervate', 'external', 29166, 'manual', true, 160),

    ('death_grip', 'death_knight_utility', 'raid_utility', 49576, 'manual', true, 170),
    ('anti_magic_zone', 'death_knight_utility', 'raid_utility', 51052, 'manual', true, 171),

    ('blessing_of_protection', 'blessing_of_protection', 'external', 1022, 'manual', true, 180),
    ('rallying_cry', 'rallying_cry', 'raid_defensive', 97462, 'manual', true, 190),
    ('darkness', 'darkness', 'raid_defensive', 196718, 'manual', true, 200),

    ('ice_block', 'immunity', 'raid_defensive', 45438, 'manual', true, 210),
    ('divine_shield', 'immunity', 'raid_defensive', 642, 'manual', true, 211),
    ('aspect_of_the_turtle', 'immunity', 'raid_defensive', 186265, 'manual', true, 212),
    ('cloak_of_shadows', 'immunity', 'raid_defensive', 31224, 'manual', true, 213),
    ('netherwalk', 'immunity', 'raid_defensive', 196555, 'manual', true, 214),
    ('dispersion', 'immunity', 'raid_defensive', 47585, 'manual', true, 215),

    ('skyfury', 'skyfury', 'raid_utility', 462854, 'manual', true, 220),
    ('atrophic_poison_boss_dr', 'boss_damage_reduction', 'raid_utility', 381637, 'manual', true, 230),
    ('blessing_of_the_bronze', 'dragon_utility', 'raid_utility', 364342, 'manual', true, 240),

    ('execute_warrior_arms', 'execute_damage', 'raid_utility', 163201, 'manual', true, 250),
    ('execute_warrior_fury', 'execute_damage', 'raid_utility', 5308, 'manual', true, 251),
    ('shadow_word_death', 'execute_damage', 'raid_utility', 32379, 'manual', true, 252),
    ('kill_shot', 'execute_damage', 'raid_utility', 53351, 'manual', true, 253),
    ('hammer_of_wrath', 'execute_damage', 'raid_utility', 24275, 'manual', true, 254),
    ('touch_of_death', 'execute_damage', 'raid_utility', 322109, 'manual', true, 255),

    ('curse_of_weakness_attack_speed', 'attack_speed_reduction', 'raid_utility', 702, 'manual', true, 260),
    ('curse_of_tongues_cast_speed', 'cast_speed_reduction', 'raid_utility', 1714, 'manual', true, 270)
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
    ('rebirth', 'druid', NULL),
    ('raise_ally', 'death-knight', NULL),
    ('soulstone', 'warlock', NULL),
    ('intercession', 'paladin', NULL),
    ('return_evoker', 'evoker', NULL),

    ('stampeding_roar', 'druid', NULL),
    ('wind_rush_totem', 'shaman', NULL),
    ('zephyr', 'evoker', NULL),

    ('demonic_gateway', 'warlock', NULL),
    ('soulwell', 'warlock', NULL),
    ('curse_of_tongues_warlock_utility', 'warlock', NULL),
    ('curse_of_weakness_warlock_utility', 'warlock', NULL),

    ('mass_dispel', 'priest', NULL),
    ('innervate', 'druid', NULL),

    ('death_grip', 'death-knight', NULL),
    ('anti_magic_zone', 'death-knight', NULL),

    ('blessing_of_protection', 'paladin', NULL),
    ('rallying_cry', 'warrior', NULL),
    ('darkness', 'demon-hunter', NULL),

    ('ice_block', 'mage', NULL),
    ('divine_shield', 'paladin', NULL),
    ('aspect_of_the_turtle', 'hunter', NULL),
    ('cloak_of_shadows', 'rogue', NULL),
    ('netherwalk', 'demon-hunter', NULL),
    ('dispersion', 'priest', 'priest-shadow'),

    ('skyfury', 'shaman', NULL),
    ('atrophic_poison_boss_dr', 'rogue', NULL),
    ('blessing_of_the_bronze', 'evoker', NULL),

    ('execute_warrior_arms', 'warrior', 'warrior-arms'),
    ('execute_warrior_fury', 'warrior', 'warrior-fury'),
    ('shadow_word_death', 'priest', NULL),
    ('kill_shot', 'hunter', NULL),
    ('hammer_of_wrath', 'paladin', NULL),
    ('touch_of_death', 'monk', NULL),

    ('curse_of_weakness_attack_speed', 'warlock', NULL),
    ('curse_of_tongues_cast_speed', 'warlock', NULL)
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
