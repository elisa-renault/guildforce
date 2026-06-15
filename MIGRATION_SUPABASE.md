# Migration Lovable -> Supabase (procedure manuelle)

Ce document est la reference de migration.

> Note: les anciens scripts `scripts/*.ps1` et `scripts/*.sh` ont ete supprimes pour alleger le repo.

## 0) Prerequis

- Nouveau projet Supabase propre.
- Supabase CLI installee et connectee.
- `psql` disponible.
- Migrations presentes dans `supabase/migrations/`.

## 1) Variables `.env` minimales

```env
NEW_SUPABASE_PROJECT_ID="..."
NEW_SUPABASE_URL="https://<project_ref>.supabase.co"
NEW_SUPABASE_ANON_KEY="..."
NEW_SUPABASE_SERVICE_ROLE_KEY="..."
NEW_SUPABASE_DB_URL="postgresql://postgres:<PASSWORD_URL_ENCODED>@db.<project_ref>.supabase.co:5432/postgres"
SYNC_WOW_SPELLS_URL="https://<project_ref>.supabase.co/functions/v1/sync-wow-spells"
CRON_SECRET="<long-random-secret>"
```

## 2) Appliquer le schema

```bash
supabase login
supabase link --project-ref <NEW_SUPABASE_PROJECT_ID>
supabase db push --include-all
```

## 3) Import des donnees `public.*`

Important: ne pas importer `auth.users` ni `auth.identities`.

### 3.1 Nettoyer le schema `public`

```sql
do $$
declare
  sql text;
begin
  select 'TRUNCATE TABLE ' ||
         string_agg(format('%I.%I', schemaname, tablename), ', ') ||
         ' RESTART IDENTITY CASCADE'
    into sql
  from pg_tables
  where schemaname = 'public';

  execute sql;
end $$;
```

### 3.2 Importer le SQL data-only

```powershell
$path = ".\\logs\\ordered_data_only.sql"
$wrapper = Join-Path $env:TEMP "import_with_replica.sql"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$body = Get-Content $path -Raw
$wrapped = @"
SET session_replication_role = replica;
$body
SET session_replication_role = origin;
"@
[System.IO.File]::WriteAllText($wrapper, $wrapped, $utf8NoBom)

$env:PGCLIENTENCODING="UTF8"
psql $env:NEW_SUPABASE_DB_URL -v ON_ERROR_STOP=1 -f $wrapper
```

Si le backup contient des `INSERT` sur colonnes generees, supprimer ces lignes avant import (ex: `public.wow_guild_memberships`, `public.guild_roster_cache`).

## 4) Secrets + edge functions

```bash
supabase secrets set BATTLENET_CLIENT_ID="..."
supabase secrets set BATTLENET_CLIENT_SECRET="..."
supabase secrets set SUPABASE_URL="https://<project_ref>.supabase.co"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="..."
supabase secrets set CRON_SECRET="$CRON_SECRET"

psql "$NEW_SUPABASE_DB_URL" -v ON_ERROR_STOP=1 \
  -c "alter database postgres set \"app.settings.sync_wow_spells_url\" = '$SYNC_WOW_SPELLS_URL';" \
  -c "alter database postgres set \"app.settings.cron_secret\" = '$CRON_SECRET';"

supabase functions deploy battlenet-auth
supabase functions deploy submit-bug-report
supabase functions deploy sync-wow-spells
```

## 5) Auth dashboard

Authentication -> URL Configuration:
- Site URL: `http://localhost:8080` (dev)
- Redirect URLs: `http://localhost:8080/auth`, `http://localhost:8080/*`, et URLs prod.

## 6) Verification rapide

```sql
select id, email from auth.users order by created_at desc limit 3;
select id, battlenet_id, battletag from public.profiles order by updated_at desc limit 3;
```

## 7) Erreurs courantes

- `duplicate key value violates legal_pages_slug_key`
  - vider `public.legal_pages`, puis relancer l'import.
- `duplicate key value violates profiles_pkey`
  - refaire le `TRUNCATE` du schema `public`.
- `cannot insert a non-DEFAULT value into column "is_guild_master"`
  - retirer les `INSERT` des tables avec colonnes generees.
- `psql` se connecte a localhost
  - verifier que `NEW_SUPABASE_DB_URL` est bien chargee.
