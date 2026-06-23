UPDATE public.composition_abilities
SET
  coverage_key = ability_key,
  ability_kind = CASE ability_key
    WHEN 'anti_magic_zone' THEN 'raid_defensive'
    WHEN 'soulwell' THEN 'raid_buff'
    ELSE ability_kind
  END,
  active = CASE
    WHEN ability_key IN (
      'curse_of_tongues_warlock_utility',
      'curse_of_weakness_warlock_utility'
    ) THEN false
    ELSE active
  END,
  sort_order = CASE ability_key
    WHEN 'demonic_gateway' THEN 140
    WHEN 'soulwell' THEN 141
    WHEN 'curse_of_tongues_warlock_utility' THEN 142
    WHEN 'curse_of_weakness_warlock_utility' THEN 143
    WHEN 'death_grip' THEN 170
    WHEN 'anti_magic_zone' THEN 171
    ELSE sort_order
  END,
  updated_at = now()
WHERE ability_key IN (
  'demonic_gateway',
  'soulwell',
  'curse_of_tongues_warlock_utility',
  'curse_of_weakness_warlock_utility',
  'death_grip',
  'anti_magic_zone'
);
