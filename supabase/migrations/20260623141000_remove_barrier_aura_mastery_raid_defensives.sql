UPDATE public.composition_abilities
SET
  active = false,
  updated_at = now()
WHERE ability_key IN (
  'power_word_barrier_raid_defensive',
  'aura_mastery_raid_defensive'
);
