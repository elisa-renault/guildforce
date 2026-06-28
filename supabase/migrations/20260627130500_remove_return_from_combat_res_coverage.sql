DELETE FROM public.composition_ability_mappings
WHERE ability_id IN (
  SELECT id
  FROM public.composition_abilities
  WHERE ability_key = 'return_evoker'
    AND coverage_key = 'combat_res'
);

UPDATE public.composition_abilities
SET
  active = false,
  updated_at = now()
WHERE ability_key = 'return_evoker'
  AND coverage_key = 'combat_res';
