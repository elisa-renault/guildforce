UPDATE public.composition_abilities
SET
  ability_kind = 'raid_buff',
  coverage_key = ability_key,
  sort_order = CASE ability_key
    WHEN 'devotion_aura' THEN 40
    WHEN 'ebon_might' THEN 140
    ELSE sort_order
  END,
  updated_at = now()
WHERE ability_key IN ('devotion_aura', 'ebon_might');
