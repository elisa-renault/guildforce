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
    ('cleanse_ally_magic_dispel', 'ally_magic_dispels', 'raid_utility', 4987, 'manual', true, 520),
    ('natures_cure_ally_magic_dispel', 'ally_magic_dispels', 'raid_utility', 88423, 'manual', true, 521),
    ('naturalize_ally_magic_dispel', 'ally_magic_dispels', 'raid_utility', 360823, 'manual', true, 522),
    ('detox_mistweaver_ally_magic_dispel', 'ally_magic_dispels', 'raid_utility', 115450, 'manual', true, 523),
    ('purify_ally_magic_dispel', 'ally_magic_dispels', 'raid_utility', 527, 'manual', true, 524),
    ('purify_spirit_ally_magic_dispel', 'ally_magic_dispels', 'raid_utility', 254420, 'manual', true, 525),
    ('mass_dispel_ally_magic_dispel', 'ally_magic_dispels', 'raid_utility', 32375, 'manual', true, 526),
    ('revival_ally_magic_dispel', 'ally_magic_dispels', 'raid_utility', 115310, 'manual', true, 527),
    ('singe_magic_ally_magic_dispel', 'ally_magic_dispels', 'raid_utility', 89808, 'manual', true, 528),

    ('remove_corruption_ally_curse_dispel', 'ally_curse_dispels', 'raid_utility', 2782, 'manual', true, 530),
    ('natures_cure_ally_curse_dispel', 'ally_curse_dispels', 'raid_utility', 88423, 'manual', true, 531),
    ('cauterizing_flame_ally_curse_dispel', 'ally_curse_dispels', 'raid_utility', 374251, 'manual', true, 532),
    ('remove_curse_ally_curse_dispel', 'ally_curse_dispels', 'raid_utility', 475, 'manual', true, 533),
    ('cleanse_spirit_ally_curse_dispel', 'ally_curse_dispels', 'raid_utility', 51886, 'manual', true, 534),
    ('purify_spirit_ally_curse_dispel', 'ally_curse_dispels', 'raid_utility', 254420, 'manual', true, 535),

    ('remove_corruption_ally_poison_dispel', 'ally_poison_dispels', 'raid_utility', 2782, 'manual', true, 540),
    ('natures_cure_ally_poison_dispel', 'ally_poison_dispels', 'raid_utility', 88423, 'manual', true, 541),
    ('expunge_ally_poison_dispel', 'ally_poison_dispels', 'raid_utility', 365585, 'manual', true, 542),
    ('naturalize_ally_poison_dispel', 'ally_poison_dispels', 'raid_utility', 360823, 'manual', true, 543),
    ('cauterizing_flame_ally_poison_dispel', 'ally_poison_dispels', 'raid_utility', 374251, 'manual', true, 544),
    ('detox_ally_poison_dispel', 'ally_poison_dispels', 'raid_utility', 218164, 'manual', true, 545),
    ('detox_mistweaver_ally_poison_dispel', 'ally_poison_dispels', 'raid_utility', 115450, 'manual', true, 546),
    ('revival_ally_poison_dispel', 'ally_poison_dispels', 'raid_utility', 115310, 'manual', true, 547),
    ('restoral_ally_poison_dispel', 'ally_poison_dispels', 'raid_utility', 388615, 'manual', true, 548),
    ('cleanse_ally_poison_dispel', 'ally_poison_dispels', 'raid_utility', 4987, 'manual', true, 549),
    ('cleanse_toxins_ally_poison_dispel', 'ally_poison_dispels', 'raid_utility', 213644, 'manual', true, 550),
    ('poison_cleansing_totem_ally_poison_dispel', 'ally_poison_dispels', 'raid_utility', 383013, 'manual', true, 551),

    ('cauterizing_flame_ally_disease_dispel', 'ally_disease_dispels', 'raid_utility', 374251, 'manual', true, 560),
    ('detox_ally_disease_dispel', 'ally_disease_dispels', 'raid_utility', 218164, 'manual', true, 561),
    ('detox_mistweaver_ally_disease_dispel', 'ally_disease_dispels', 'raid_utility', 115450, 'manual', true, 562),
    ('revival_ally_disease_dispel', 'ally_disease_dispels', 'raid_utility', 115310, 'manual', true, 563),
    ('restoral_ally_disease_dispel', 'ally_disease_dispels', 'raid_utility', 388615, 'manual', true, 564),
    ('cleanse_ally_disease_dispel', 'ally_disease_dispels', 'raid_utility', 4987, 'manual', true, 565),
    ('cleanse_toxins_ally_disease_dispel', 'ally_disease_dispels', 'raid_utility', 213644, 'manual', true, 566),
    ('purify_ally_disease_dispel', 'ally_disease_dispels', 'raid_utility', 527, 'manual', true, 567),
    ('purify_disease_ally_disease_dispel', 'ally_disease_dispels', 'raid_utility', 213634, 'manual', true, 568),

    ('cauterizing_flame_ally_bleed_dispel', 'ally_bleed_dispels', 'raid_utility', 374251, 'manual', true, 570),
    ('tremor_totem_ally_fear_charm_sleep_dispel', 'ally_fear_charm_sleep_dispels', 'raid_utility', 8143, 'manual', true, 580),
    ('blessing_of_freedom_ally_roots_snares_dispel', 'ally_roots_snares_dispels', 'raid_utility', 1044, 'manual', true, 590),
    ('tigers_lust_ally_roots_snares_dispel', 'ally_roots_snares_dispels', 'raid_utility', 116841, 'manual', true, 591),
    ('masters_call_ally_roots_snares_dispel', 'ally_roots_snares_dispels', 'raid_utility', 53271, 'manual', true, 592)
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
    ('cleanse_ally_magic_dispel', 'paladin', 'paladin-holy'),
    ('natures_cure_ally_magic_dispel', 'druid', 'druid-restoration'),
    ('naturalize_ally_magic_dispel', 'evoker', 'evoker-preservation'),
    ('detox_mistweaver_ally_magic_dispel', 'monk', 'monk-mistweaver'),
    ('purify_ally_magic_dispel', 'priest', 'priest-discipline'),
    ('purify_ally_magic_dispel', 'priest', 'priest-holy'),
    ('purify_spirit_ally_magic_dispel', 'shaman', 'shaman-restoration'),
    ('mass_dispel_ally_magic_dispel', 'priest', NULL),
    ('revival_ally_magic_dispel', 'monk', 'monk-mistweaver'),
    ('singe_magic_ally_magic_dispel', 'warlock', NULL),

    ('remove_corruption_ally_curse_dispel', 'druid', 'druid-balance'),
    ('remove_corruption_ally_curse_dispel', 'druid', 'druid-feral'),
    ('remove_corruption_ally_curse_dispel', 'druid', 'druid-guardian'),
    ('natures_cure_ally_curse_dispel', 'druid', 'druid-restoration'),
    ('cauterizing_flame_ally_curse_dispel', 'evoker', NULL),
    ('remove_curse_ally_curse_dispel', 'mage', NULL),
    ('cleanse_spirit_ally_curse_dispel', 'shaman', 'shaman-elemental'),
    ('cleanse_spirit_ally_curse_dispel', 'shaman', 'shaman-enhancement'),
    ('purify_spirit_ally_curse_dispel', 'shaman', 'shaman-restoration'),

    ('remove_corruption_ally_poison_dispel', 'druid', 'druid-balance'),
    ('remove_corruption_ally_poison_dispel', 'druid', 'druid-feral'),
    ('remove_corruption_ally_poison_dispel', 'druid', 'druid-guardian'),
    ('natures_cure_ally_poison_dispel', 'druid', 'druid-restoration'),
    ('expunge_ally_poison_dispel', 'evoker', 'evoker-devastation'),
    ('expunge_ally_poison_dispel', 'evoker', 'evoker-augmentation'),
    ('naturalize_ally_poison_dispel', 'evoker', 'evoker-preservation'),
    ('cauterizing_flame_ally_poison_dispel', 'evoker', NULL),
    ('detox_ally_poison_dispel', 'monk', 'monk-brewmaster'),
    ('detox_ally_poison_dispel', 'monk', 'monk-windwalker'),
    ('detox_mistweaver_ally_poison_dispel', 'monk', 'monk-mistweaver'),
    ('revival_ally_poison_dispel', 'monk', 'monk-mistweaver'),
    ('restoral_ally_poison_dispel', 'monk', 'monk-mistweaver'),
    ('cleanse_ally_poison_dispel', 'paladin', 'paladin-holy'),
    ('cleanse_toxins_ally_poison_dispel', 'paladin', 'paladin-protection'),
    ('cleanse_toxins_ally_poison_dispel', 'paladin', 'paladin-retribution'),
    ('poison_cleansing_totem_ally_poison_dispel', 'shaman', NULL),

    ('cauterizing_flame_ally_disease_dispel', 'evoker', NULL),
    ('detox_ally_disease_dispel', 'monk', 'monk-brewmaster'),
    ('detox_ally_disease_dispel', 'monk', 'monk-windwalker'),
    ('detox_mistweaver_ally_disease_dispel', 'monk', 'monk-mistweaver'),
    ('revival_ally_disease_dispel', 'monk', 'monk-mistweaver'),
    ('restoral_ally_disease_dispel', 'monk', 'monk-mistweaver'),
    ('cleanse_ally_disease_dispel', 'paladin', 'paladin-holy'),
    ('cleanse_toxins_ally_disease_dispel', 'paladin', 'paladin-protection'),
    ('cleanse_toxins_ally_disease_dispel', 'paladin', 'paladin-retribution'),
    ('purify_ally_disease_dispel', 'priest', 'priest-discipline'),
    ('purify_ally_disease_dispel', 'priest', 'priest-holy'),
    ('purify_disease_ally_disease_dispel', 'priest', 'priest-shadow'),

    ('cauterizing_flame_ally_bleed_dispel', 'evoker', NULL),
    ('tremor_totem_ally_fear_charm_sleep_dispel', 'shaman', NULL),
    ('blessing_of_freedom_ally_roots_snares_dispel', 'paladin', NULL),
    ('tigers_lust_ally_roots_snares_dispel', 'monk', NULL),
    ('masters_call_ally_roots_snares_dispel', 'hunter', NULL)
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

WITH seed_spells (
  spell_id,
  name_en
) AS (
  VALUES
    (4987, 'Cleanse'),
    (88423, 'Nature''s Cure'),
    (360823, 'Naturalize'),
    (115450, 'Detox'),
    (527, 'Purify'),
    (254420, 'Purify Spirit'),
    (32375, 'Mass Dispel'),
    (115310, 'Revival'),
    (89808, 'Singe Magic'),
    (2782, 'Remove Corruption'),
    (374251, 'Cauterizing Flame'),
    (475, 'Remove Curse'),
    (51886, 'Cleanse Spirit'),
    (365585, 'Expunge'),
    (218164, 'Detox'),
    (388615, 'Restoral'),
    (213644, 'Cleanse Toxins'),
    (383013, 'Poison Cleansing Totem'),
    (213634, 'Purify Disease'),
    (8143, 'Tremor Totem'),
    (1044, 'Blessing of Freedom'),
    (116841, 'Tiger''s Lust'),
    (53271, 'Master''s Call')
)
INSERT INTO public.wow_spells (
  spell_id,
  name_en
)
SELECT
  spell_id,
  name_en
FROM seed_spells
ON CONFLICT (spell_id) DO UPDATE
SET
  name_en = COALESCE(public.wow_spells.name_en, EXCLUDED.name_en),
  updated_at = now();
