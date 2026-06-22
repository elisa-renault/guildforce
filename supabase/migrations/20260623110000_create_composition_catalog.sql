CREATE TABLE IF NOT EXISTS public.composition_abilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ability_key text NOT NULL UNIQUE,
  coverage_key text NOT NULL,
  ability_kind text NOT NULL,
  spell_id integer,
  cooldown_profile text,
  cooldown_seconds integer,
  source text NOT NULL DEFAULT 'manual',
  source_label_fr text,
  source_url text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  source_updated_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.composition_ability_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ability_id uuid NOT NULL REFERENCES public.composition_abilities(id) ON DELETE CASCADE,
  class_id text NOT NULL,
  spec_id text,
  role text,
  applies_to_main boolean NOT NULL DEFAULT true,
  applies_to_offspec_alt boolean NOT NULL DEFAULT false,
  notes text
);

ALTER TABLE public.composition_abilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.composition_ability_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read composition_abilities"
ON public.composition_abilities
FOR SELECT
USING (true);

CREATE POLICY "Public read composition_ability_mappings"
ON public.composition_ability_mappings
FOR SELECT
USING (true);

CREATE INDEX IF NOT EXISTS composition_abilities_active_kind_idx
ON public.composition_abilities (active, ability_kind);

CREATE INDEX IF NOT EXISTS composition_abilities_spell_id_idx
ON public.composition_abilities (spell_id)
WHERE spell_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS composition_ability_mappings_ability_id_idx
ON public.composition_ability_mappings (ability_id);

CREATE INDEX IF NOT EXISTS composition_ability_mappings_class_idx
ON public.composition_ability_mappings (class_id, spec_id);

CREATE UNIQUE INDEX IF NOT EXISTS composition_ability_mappings_unique_idx
ON public.composition_ability_mappings (ability_id, class_id, spec_id, role)
NULLS NOT DISTINCT;

DROP TRIGGER IF EXISTS update_composition_abilities_updated_at ON public.composition_abilities;

CREATE TRIGGER update_composition_abilities_updated_at
BEFORE UPDATE ON public.composition_abilities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

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
    ('arcane_intellect', 'arcane_intellect', 'raid_buff', 1459, 'manual', true, 10),
    ('battle_shout', 'battle_shout', 'raid_buff', 6673, 'manual', true, 20),
    ('power_word_fortitude', 'power_word_fortitude', 'raid_buff', 21562, 'manual', true, 30),
    ('skyfury', 'skyfury', 'raid_buff', 462854, 'manual', true, 40),
    ('mark_of_the_wild', 'mark_of_the_wild', 'raid_buff', 1126, 'manual', true, 50),
    ('mystic_touch', 'mystic_touch', 'raid_debuff', 8647, 'manual', true, 60),
    ('chaos_brand', 'chaos_brand', 'raid_debuff', 255260, 'manual', true, 70),
    ('hunters_mark', 'hunters_mark', 'raid_debuff', 257284, 'manual', true, 80),
    ('atrophic_poison', 'atrophic_poison', 'raid_debuff', 381637, 'manual', true, 90),
    ('blessing_of_the_bronze', 'blessing_of_the_bronze', 'raid_utility', 364342, 'manual', true, 100),
    ('bloodlust', 'bloodlust', 'raid_utility', 2825, 'manual', true, 110),
    ('soulwell', 'soulwell', 'raid_utility', 29893, 'manual', true, 120),
    ('devotion_aura', 'devotion_aura', 'raid_defensive', 465, 'manual', true, 130),
    ('ebon_might', 'ebon_might', 'external', 395152, 'manual', true, 140)
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
    ('arcane_intellect', 'mage', NULL),
    ('battle_shout', 'warrior', NULL),
    ('power_word_fortitude', 'priest', NULL),
    ('skyfury', 'shaman', NULL),
    ('mark_of_the_wild', 'druid', NULL),
    ('mystic_touch', 'monk', NULL),
    ('chaos_brand', 'demon-hunter', NULL),
    ('hunters_mark', 'hunter', NULL),
    ('atrophic_poison', 'rogue', NULL),
    ('blessing_of_the_bronze', 'evoker', NULL),
    ('bloodlust', 'shaman', NULL),
    ('soulwell', 'warlock', NULL),
    ('devotion_aura', 'paladin', NULL),
    ('ebon_might', 'evoker', 'evoker-augmentation')
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
