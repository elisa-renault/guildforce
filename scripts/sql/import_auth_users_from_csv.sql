-- Import auth.users from a CSV containing: id,email,created_at,last_sign_in_at
-- Usage (psql): -v csv_path='""/absolute/path/to/guildforce_users.csv""'

BEGIN;

CREATE TEMP TABLE tmp_auth_users (
  id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz
);

\copy tmp_auth_users (id, email, created_at, last_sign_in_at) FROM :'csv_path' WITH (FORMAT csv, HEADER true)

INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  created_at,
  updated_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin
)
SELECT
  t.id,
  (SELECT id FROM auth.instances ORDER BY created_at LIMIT 1),
  'authenticated',
  'authenticated',
  NULLIF(t.email, ''),
  COALESCE(t.created_at, now()),
  COALESCE(t.created_at, now()),
  t.last_sign_in_at,
  '{}'::jsonb,
  '{}'::jsonb,
  false
FROM tmp_auth_users t
ON CONFLICT (id) DO NOTHING;

-- Ensure instance_id/aud/role are set for any pre-existing rows
UPDATE auth.users
SET instance_id = (SELECT id FROM auth.instances ORDER BY created_at LIMIT 1)
WHERE instance_id IS NULL;

UPDATE auth.users
SET aud = 'authenticated'
WHERE aud IS NULL;

UPDATE auth.users
SET role = 'authenticated'
WHERE role IS NULL;

COMMIT;
