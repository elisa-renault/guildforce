SELECT setval(
  pg_get_serial_sequence('public.raid_effects', 'id'),
  COALESCE((SELECT max(id) FROM public.raid_effects), 1)
);

WITH seed_effects (
  class_id,
  spec_id,
  category,
  spell_id,
  effect_key,
  source,
  active,
  sort_order
) AS (
  VALUES
    ('shaman', NULL, 'major_buff', 32182, 'heroism', 'manual', true, 91),
    ('mage', NULL, 'major_buff', 80353, 'time_warp', 'manual', true, 92),
    ('hunter', NULL, 'major_buff', 264667, 'primal_rage', 'manual', true, 93),
    ('evoker', NULL, 'major_buff', 390386, 'fury_of_the_aspects', 'manual', true, 94)
)
INSERT INTO public.raid_effects (
  class_id,
  spec_id,
  category,
  spell_id,
  effect_key,
  source,
  active,
  sort_order
)
SELECT
  class_id,
  spec_id,
  category,
  spell_id,
  effect_key,
  source,
  active,
  sort_order
FROM seed_effects
ON CONFLICT (source, effect_key)
WHERE effect_key IS NOT NULL
DO UPDATE
SET
  class_id = EXCLUDED.class_id,
  spec_id = EXCLUDED.spec_id,
  category = EXCLUDED.category,
  spell_id = EXCLUDED.spell_id,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();
