-- Keep legal_pages.updated_at synchronized with translation content changes.

BEGIN;

CREATE OR REPLACE FUNCTION public.sync_legal_page_parent_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_legal_page_id uuid;
BEGIN
  v_legal_page_id := COALESCE(NEW.legal_page_id, OLD.legal_page_id);

  IF v_legal_page_id IS NOT NULL THEN
    UPDATE public.legal_pages
    SET updated_at = now()
    WHERE id = v_legal_page_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS sync_legal_page_parent_updated_at_on_translation
  ON public.legal_page_translations;

CREATE TRIGGER sync_legal_page_parent_updated_at_on_translation
  AFTER INSERT OR UPDATE OR DELETE ON public.legal_page_translations
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_legal_page_parent_updated_at();

COMMIT;
