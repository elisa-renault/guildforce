CREATE TABLE IF NOT EXISTS public.raid_effects (
  id BIGSERIAL PRIMARY KEY,
  class_id TEXT NOT NULL,
  spec_id TEXT,
  category TEXT NOT NULL,
  spell_id INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.raid_effects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read raid_effects"
ON public.raid_effects
FOR SELECT
USING (true);

CREATE INDEX IF NOT EXISTS raid_effects_category_idx
ON public.raid_effects (category);

CREATE INDEX IF NOT EXISTS raid_effects_class_idx
ON public.raid_effects (class_id);

INSERT INTO public.raid_effects (class_id, spec_id, category, spell_id)
VALUES
  ('druid', NULL, 'major_buff', 1126),
  ('mage', NULL, 'major_buff', 1459),
  ('warrior', NULL, 'major_buff', 6673),
  ('evoker', NULL, 'major_buff', 364342),
  ('shaman', NULL, 'major_buff', 2825),
  ('warlock', NULL, 'major_buff', 29893),
  ('paladin', NULL, 'major_buff', 465),
  ('priest', NULL, 'major_buff', 21562),
  ('shaman', NULL, 'major_buff', 462854),
  ('monk', NULL, 'major_debuff', 8647),
  ('demon-hunter', NULL, 'major_debuff', 255260),
  ('hunter', NULL, 'major_debuff', 257284),
  ('rogue', NULL, 'major_debuff', 381637),
  ('evoker', 'evoker-augmentation', 'major_buff', 395152);
