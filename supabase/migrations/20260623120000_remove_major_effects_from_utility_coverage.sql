UPDATE public.composition_abilities
SET
  ability_kind = CASE
    WHEN coverage_key IN ('bloodlust', 'skyfury', 'dragon_utility') THEN 'raid_buff'
    WHEN coverage_key = 'boss_damage_reduction' THEN 'raid_debuff'
    ELSE ability_kind
  END,
  coverage_key = CASE
    WHEN coverage_key IN ('skyfury', 'dragon_utility', 'boss_damage_reduction') THEN ability_key
    ELSE coverage_key
  END,
  updated_at = now()
WHERE coverage_key IN (
  'bloodlust',
  'skyfury',
  'dragon_utility',
  'boss_damage_reduction'
);
