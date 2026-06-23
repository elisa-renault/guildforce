UPDATE public.composition_abilities
SET
  coverage_key = CASE ability_key
    WHEN 'tail_swipe_knock' THEN 'knockups'
    ELSE 'knockbacks'
  END,
  sort_order = CASE ability_key
    WHEN 'typhoon_knock' THEN 280
    WHEN 'thunderstorm_knock' THEN 281
    WHEN 'ring_of_peace_knock' THEN 282
    WHEN 'wing_buffet_knock' THEN 283
    WHEN 'tail_swipe_knock' THEN 284
    ELSE sort_order
  END,
  updated_at = now()
WHERE ability_key IN (
  'typhoon_knock',
  'thunderstorm_knock',
  'ring_of_peace_knock',
  'wing_buffet_knock',
  'tail_swipe_knock'
);

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
    ('thundershock_knockup', 'knockups', 'raid_utility', 378779, 'manual', true, 285),

    ('chaos_nova_aoe_stun', 'aoe_stuns', 'raid_utility', 179057, 'manual', true, 360),
    ('void_nova_aoe_stun', 'aoe_stuns', 'raid_utility', 1234195, 'manual', true, 361),
    ('leg_sweep_aoe_stun', 'aoe_stuns', 'raid_utility', 119381, 'manual', true, 362),
    ('capacitor_totem_aoe_stun', 'aoe_stuns', 'raid_utility', 192058, 'manual', true, 363),
    ('shadowfury_aoe_stun', 'aoe_stuns', 'raid_utility', 30283, 'manual', true, 364),
    ('binding_shot_aoe_stun', 'aoe_stuns', 'raid_utility', 117526, 'manual', true, 365),
    ('shockwave_aoe_stun', 'aoe_stuns', 'raid_utility', 46968, 'manual', true, 366),

    ('mass_entanglement_aoe_root', 'aoe_roots', 'raid_utility', 102359, 'manual', true, 370),
    ('entangling_vortex_aoe_root', 'aoe_roots', 'raid_utility', 439895, 'manual', true, 371),
    ('landslide_aoe_root', 'aoe_roots', 'raid_utility', 358385, 'manual', true, 372),
    ('frost_nova_aoe_root', 'aoe_roots', 'raid_utility', 122, 'manual', true, 373),
    ('void_tendrils_aoe_root', 'aoe_roots', 'raid_utility', 1250691, 'manual', true, 374),
    ('earthgrab_totem_aoe_root', 'aoe_roots', 'raid_utility', 51485, 'manual', true, 375),

    ('sigil_of_chains_aoe_slow', 'aoe_slows', 'raid_utility', 202138, 'manual', true, 380),
    ('wave_of_debilitation_aoe_slow', 'aoe_slows', 'raid_utility', 452403, 'manual', true, 381),
    ('typhoon_aoe_slow', 'aoe_slows', 'raid_utility', 132469, 'manual', true, 382),
    ('ursols_vortex_aoe_slow', 'aoe_slows', 'raid_utility', 102793, 'manual', true, 383),
    ('tail_swipe_aoe_slow', 'aoe_slows', 'raid_utility', 368970, 'manual', true, 384),
    ('wing_buffet_aoe_slow', 'aoe_slows', 'raid_utility', 357214, 'manual', true, 385),
    ('tar_trap_aoe_slow', 'aoe_slows', 'raid_utility', 187698, 'manual', true, 386),
    ('earthbind_totem_aoe_slow', 'aoe_slows', 'raid_utility', 2484, 'manual', true, 387),
    ('earthgrab_totem_aoe_slow', 'aoe_slows', 'raid_utility', 51485, 'manual', true, 388),
    ('thunderstorm_aoe_slow', 'aoe_slows', 'raid_utility', 51490, 'manual', true, 389),
    ('piercing_howl_aoe_slow', 'aoe_slows', 'raid_utility', 12323, 'manual', true, 390),
    ('boneshaker_aoe_slow', 'aoe_slows', 'raid_utility', 429639, 'manual', true, 391)
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
    ('thundershock_knockup', 'shaman', NULL),

    ('chaos_nova_aoe_stun', 'demon-hunter', NULL),
    ('void_nova_aoe_stun', 'demon-hunter', NULL),
    ('leg_sweep_aoe_stun', 'monk', NULL),
    ('capacitor_totem_aoe_stun', 'shaman', NULL),
    ('shadowfury_aoe_stun', 'warlock', NULL),
    ('binding_shot_aoe_stun', 'hunter', NULL),
    ('shockwave_aoe_stun', 'warrior', NULL),

    ('mass_entanglement_aoe_root', 'druid', NULL),
    ('entangling_vortex_aoe_root', 'druid', NULL),
    ('landslide_aoe_root', 'evoker', NULL),
    ('frost_nova_aoe_root', 'mage', NULL),
    ('void_tendrils_aoe_root', 'priest', NULL),
    ('earthgrab_totem_aoe_root', 'shaman', NULL),

    ('sigil_of_chains_aoe_slow', 'demon-hunter', NULL),
    ('wave_of_debilitation_aoe_slow', 'demon-hunter', NULL),
    ('typhoon_aoe_slow', 'druid', NULL),
    ('ursols_vortex_aoe_slow', 'druid', NULL),
    ('tail_swipe_aoe_slow', 'evoker', NULL),
    ('wing_buffet_aoe_slow', 'evoker', NULL),
    ('tar_trap_aoe_slow', 'hunter', NULL),
    ('earthbind_totem_aoe_slow', 'shaman', NULL),
    ('earthgrab_totem_aoe_slow', 'shaman', NULL),
    ('thunderstorm_aoe_slow', 'shaman', NULL),
    ('piercing_howl_aoe_slow', 'warrior', NULL),
    ('boneshaker_aoe_slow', 'warrior', NULL)
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
  name_en,
  name_fr
) AS (
  VALUES
    (378779, 'Thundershock', 'Thundershock'),
    (179057, 'Chaos Nova', 'Nova du chaos'),
    (1234195, 'Void Nova', 'Nova du Vide'),
    (119381, 'Leg Sweep', 'Balayement de jambe'),
    (192058, 'Capacitor Totem', 'Totem condensateur'),
    (30283, 'Shadowfury', 'Furie de l’ombre'),
    (117526, 'Binding Shot', 'Tir de lien'),
    (46968, 'Shockwave', 'Onde de choc'),
    (102359, 'Mass Entanglement', 'Enchevêtrement de masse'),
    (439895, 'Entangling Vortex', 'Vortex enchevêtrant'),
    (358385, 'Landslide', 'Glissement de terrain'),
    (122, 'Frost Nova', 'Nova de givre'),
    (1250691, 'Void Tendrils', 'Vrilles du Vide'),
    (51485, 'Earthgrab Totem', 'Totem de poigne de terre'),
    (202138, 'Sigil of Chains', 'Cachet des chaînes'),
    (452403, 'Wave of Debilitation', 'Vague d’affaiblissement'),
    (102793, 'Ursol''s Vortex', 'Vortex d’Ursol'),
    (187698, 'Tar Trap', 'Piège de goudron'),
    (2484, 'Earthbind Totem', 'Totem de lien terrestre'),
    (12323, 'Piercing Howl', 'Hurlement perçant'),
    (429639, 'Boneshaker', 'Boneshaker')
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
