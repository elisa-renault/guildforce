-- Provide a secure helper to list all public tables (used by backend full-backup export)
CREATE OR REPLACE FUNCTION public.list_public_tables()
RETURNS TABLE(table_name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.table_name::text
  FROM information_schema.tables t
  WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
  ORDER BY t.table_name;
$$;

REVOKE ALL ON FUNCTION public.list_public_tables() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_public_tables() TO service_role;