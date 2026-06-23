-- Remove short-range pseudo-grips from enemy grouping coverage.
-- They remain available for their stronger control categories where applicable.
UPDATE public.composition_abilities
SET active = false
WHERE ability_key IN (
  'sigil_of_chains_enemy_grouping',
  'ursols_vortex_enemy_grouping'
)
AND coverage_key = 'enemy_grips_and_grouping';
