ALTER TABLE public.raid_effects
ADD COLUMN IF NOT EXISTS effect_key text,
ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS source_label_fr text,
ADD COLUMN IF NOT EXISTS source_url text,
ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS sort_order integer,
ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
ADD COLUMN IF NOT EXISTS source_updated_at timestamptz;

UPDATE public.raid_effects
SET
  effect_key = CASE spell_id
    WHEN 1126 THEN 'mark_of_the_wild'
    WHEN 1459 THEN 'arcane_intellect'
    WHEN 6673 THEN 'battle_shout'
    WHEN 364342 THEN 'blessing_of_the_bronze'
    WHEN 2825 THEN 'bloodlust'
    WHEN 29893 THEN 'soulwell'
    WHEN 465 THEN 'devotion_aura'
    WHEN 21562 THEN 'power_word_fortitude'
    WHEN 462854 THEN 'skyfury'
    WHEN 8647 THEN 'mystic_touch'
    WHEN 255260 THEN 'chaos_brand'
    WHEN 257284 THEN 'hunters_mark'
    WHEN 381637 THEN 'atrophic_poison'
    WHEN 395152 THEN 'ebon_might'
    ELSE effect_key
  END,
  source = COALESCE(source, 'manual'),
  active = COALESCE(active, true),
  sort_order = CASE spell_id
    WHEN 1459 THEN 10
    WHEN 6673 THEN 20
    WHEN 21562 THEN 30
    WHEN 465 THEN 40
    WHEN 8647 THEN 50
    WHEN 255260 THEN 60
    WHEN 1126 THEN 70
    WHEN 364342 THEN 80
    WHEN 2825 THEN 90
    WHEN 29893 THEN 100
    WHEN 462854 THEN 110
    WHEN 257284 THEN 120
    WHEN 381637 THEN 130
    WHEN 395152 THEN 140
    ELSE sort_order
  END
WHERE effect_key IS NULL OR source IS NULL OR active IS NULL OR sort_order IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS raid_effects_source_key_uidx
ON public.raid_effects (source, effect_key)
WHERE effect_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS raid_effects_active_category_idx
ON public.raid_effects (active, category);

DROP TRIGGER IF EXISTS update_raid_effects_updated_at ON public.raid_effects;

CREATE TRIGGER update_raid_effects_updated_at
BEFORE UPDATE ON public.raid_effects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
