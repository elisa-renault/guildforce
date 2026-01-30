CREATE TABLE IF NOT EXISTS public.wow_spells (
  spell_id INTEGER PRIMARY KEY,
  name_en TEXT,
  description_en TEXT,
  name_fr TEXT,
  description_fr TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.wow_spells ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read wow_spells"
ON public.wow_spells
FOR SELECT
USING (true);

CREATE TRIGGER update_wow_spells_updated_at
BEFORE UPDATE ON public.wow_spells
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
