# Migration Lovable → Supabase (procédure clean, sans toucher à auth.*)

> Objectif : migrer les données métier (public.*) et **laisser Supabase Auth recréer les users au 1er login**.  
> On relie ensuite automatiquement les données historiques via `reassign_profile_id`.

---

## 0) Pré‑requis

- Nouveau projet Supabase **propre** (ne pas réutiliser un projet où auth.* a été touché).
- Supabase CLI installé et projet linké.
- Fichiers présents dans le repo :
  - `supabase/migrations/*`
  - `logs/ordered_data_only.sql`
  - `scripts/sql/*` (si besoin)

---

## 1) Config `.env`

Dans `.env` (sans secrets dans git) :

```
NEW_SUPABASE_PROJECT_ID="..."
NEW_SUPABASE_URL="https://<project_ref>.supabase.co"
NEW_SUPABASE_ANON_KEY="..."            # publishable key
NEW_SUPABASE_SERVICE_ROLE_KEY="..."
NEW_SUPABASE_DB_URL="postgresql://postgres:<PASSWORD_URL_ENCODED>@db.<project_ref>.supabase.co:5432/postgres"
```

> ⚠️ Si le mot de passe DB contient `@` ou `&`, il faut URL‑encoder :  
> `@` → `%40`, `&` → `%26`

---

## 2) Pousser le schéma (migrations)

```bash
supabase login
supabase link --project-ref <NEW_SUPABASE_PROJECT_ID>
supabase db push --include-all
```

> `--include-all` est requis pour appliquer la migration `reassign_profile_id`.

---

## 3) Préparer `ordered_data_only.sql`

Supprimer les tables qui contiennent des colonnes générées bloquantes :

- `public.wow_guild_memberships`
- `public.guild_roster_cache`

PowerShell :

```powershell
$path = ".\logs\ordered_data_only.sql"
$txt = Get-Content $path -Raw
$txt = ($txt -split "`n") | Where-Object {
  ($_ -notmatch '^INSERT INTO public\\."wow_guild_memberships"') -and
  ($_ -notmatch '^INSERT INTO public\\."guild_roster_cache"')
} | Out-String
[System.IO.File]::WriteAllText($path, $txt, (New-Object System.Text.UTF8Encoding($false)))
```

---

## 4) Importer les données public.*

**Important :** on ne touche **pas** aux tables `auth.*`.

### 4.1 Truncate `public`

Dans SQL Editor :

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

### 4.2 Import via wrapper (désactive contraintes)

PowerShell :

```powershell
$path = ".\logs\ordered_data_only.sql"
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

> Attendu : l’import se termine par `SET`.

---

## 5) Sécuriser la fonction de relink

Dans SQL Editor :

```sql
revoke all on function public.reassign_profile_id(uuid, uuid) from public;
revoke all on function public.reassign_profile_id(uuid, uuid) from anon;
revoke all on function public.reassign_profile_id(uuid, uuid) from authenticated;
```

---

## 6) Secrets + Edge Functions

```bash
supabase secrets set BATTLENET_CLIENT_ID="..."
supabase secrets set BATTLENET_CLIENT_SECRET="..."
supabase secrets set SUPABASE_URL="https://<project_ref>.supabase.co"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="..."
```

Déployer :

```bash
supabase functions deploy battlenet-auth
supabase functions deploy submit-bug-report
supabase functions deploy sync-wow-spells
```

---

## 7) Config Auth (Dashboard)

### Authentication → URL Configuration

- **Site URL** : `http://localhost:8080` (en dev)
- **Redirect URLs** :
  - `http://localhost:8080/auth`
  - `http://localhost:8080/*`
  - `https://ton-domaine.com/auth`
  - `https://ton-domaine.com/*`

---

## 8) Login Battle.net (relink automatique)

Au **premier login** :
- Supabase crée un `auth.users`
- `battlenet-auth` appelle `reassign_profile_id`
- Toutes les données historiques (profiles/guilds/rosters/…) sont reliées

### Vérification rapide

```sql
select id, email from auth.users order by created_at desc limit 3;
select id, battlenet_id, battletag from public.profiles order by updated_at desc limit 3;
```

---

## Erreurs fréquentes & fixes

### ❌ `duplicate key value violates legal_pages_slug_key`
- Cause : migrations ont déjà créé des pages légales.
- Fix :
  ```sql
  delete from public.legal_pages;
  ```
  Puis relancer l’import.

### ❌ `duplicate key value violates profiles_pkey`
- Cause : tables public déjà remplies.
- Fix : refaire le TRUNCATE `public` (voir étape 4.1).

### ❌ `cannot insert a non-DEFAULT value into column "is_guild_master"`
- Cause : colonne générée.
- Fix : supprimer `wow_guild_memberships` et `guild_roster_cache` des INSERT (étape 3).

### ❌ `psql` se connecte à localhost
- Cause : variable `NEW_SUPABASE_DB_URL` vide ou pas chargée.
- Fix : `echo $env:NEW_SUPABASE_DB_URL` puis relancer.

---

## Notes

- **Ne jamais importer `auth.users` / `auth.identities`** dans ce mode.
- L’auth se recrée au premier login Battle.net.
- `reassign_profile_id` assure la continuité des données (UUIDs re‑liés).
