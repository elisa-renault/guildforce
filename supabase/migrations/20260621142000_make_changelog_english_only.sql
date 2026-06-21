-- Align changelog publishing with the English-only admin workflow.

BEGIN;

DELETE FROM public.patch_note_translations
WHERE language <> 'en';

UPDATE public.patch_notes pn
SET updated_at = now()
WHERE EXISTS (
  SELECT 1
  FROM public.patch_note_translations pnt
  WHERE pnt.patch_note_id = pn.id
    AND pnt.language = 'en'
);

CREATE OR REPLACE FUNCTION public.sync_patch_note_parent_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patch_note_id uuid;
BEGIN
  v_patch_note_id := COALESCE(NEW.patch_note_id, OLD.patch_note_id);

  IF v_patch_note_id IS NOT NULL THEN
    UPDATE public.patch_notes
    SET updated_at = now()
    WHERE id = v_patch_note_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS sync_patch_note_parent_updated_at_on_translation
  ON public.patch_note_translations;

CREATE TRIGGER sync_patch_note_parent_updated_at_on_translation
  AFTER INSERT OR UPDATE OR DELETE ON public.patch_note_translations
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_patch_note_parent_updated_at();

COMMIT;
