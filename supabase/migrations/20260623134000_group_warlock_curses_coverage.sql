UPDATE public.composition_abilities
SET
  coverage_key = 'warlock_curses',
  sort_order = CASE ability_key
    WHEN 'curse_of_weakness_attack_speed' THEN 260
    WHEN 'curse_of_tongues_cast_speed' THEN 261
    ELSE sort_order
  END,
  updated_at = now()
WHERE ability_key IN (
  'curse_of_weakness_attack_speed',
  'curse_of_tongues_cast_speed'
);
