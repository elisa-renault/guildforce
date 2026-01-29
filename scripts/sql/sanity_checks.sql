-- Basic sanity checks after migration

-- Tables per schema
SELECT schemaname AS schema, COUNT(*) AS table_count
FROM pg_tables
GROUP BY schemaname
ORDER BY schemaname;

-- Policies per schema
SELECT schemaname AS schema, COUNT(*) AS policy_count
FROM pg_policies
GROUP BY schemaname
ORDER BY schemaname;

-- Tables with RLS enabled
SELECT n.nspname AS schema, c.relname AS table, c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r'
  AND c.relrowsecurity = true
ORDER BY n.nspname, c.relname;

-- Extensions installed
SELECT extname, extversion
FROM pg_extension
ORDER BY extname;