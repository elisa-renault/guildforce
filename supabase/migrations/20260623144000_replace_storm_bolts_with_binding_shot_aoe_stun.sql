UPDATE public.composition_abilities
SET
  active = false,
  updated_at = now()
WHERE ability_key = 'storm_bolts_aoe_stun';

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
    ('binding_shot_aoe_stun', 'aoe_stuns', 'raid_utility', 117526, 'manual', true, 365)
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
  'hunter',
  NULL,
  NULL,
  true,
  false
FROM public.composition_abilities abilities
WHERE abilities.ability_key = 'binding_shot_aoe_stun'
  AND NOT EXISTS (
    SELECT 1
    FROM public.composition_ability_mappings existing
    WHERE existing.ability_id = abilities.id
      AND existing.class_id = 'hunter'
      AND existing.spec_id IS NULL
      AND existing.role IS NULL
  );

INSERT INTO public.wow_spells (
  spell_id,
  name_en,
  name_fr,
  name_de,
  name_es,
  name_pt_br,
  name_it,
  name_ru,
  name_zh_tw,
  name_ko,
  updated_at
)
VALUES (
  117526,
  'Binding Shot',
  'Tir de lien',
  'Bindender Schuss',
  'Disparo vinculante',
  'Disparo Vinculante',
  'Tiro Vincolante',
  'Связующий выстрел',
  '束縛射擊',
  '구속의 사격',
  now()
)
ON CONFLICT (spell_id) DO UPDATE
SET
  name_en = EXCLUDED.name_en,
  name_fr = EXCLUDED.name_fr,
  name_de = EXCLUDED.name_de,
  name_es = EXCLUDED.name_es,
  name_pt_br = EXCLUDED.name_pt_br,
  name_it = EXCLUDED.name_it,
  name_ru = EXCLUDED.name_ru,
  name_zh_tw = EXCLUDED.name_zh_tw,
  name_ko = EXCLUDED.name_ko,
  updated_at = now();
