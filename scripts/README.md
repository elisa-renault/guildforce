# Migration Lovable -> Supabase (target)

Objectif: appliquer les migrations Lovable sur votre projet Supabase perso, puis importer les donnees si un backup SQL contient des INSERT/COPY.

## Prerequis
- `supabase` CLI installe et authentifie
- `psql` disponible dans le PATH
- Acces UNIQUEMENT a la nouvelle Supabase (target)

## Variables attendues (.env)
Ces variables sont lues depuis la racine du repo.

Obligatoires:
- NEW_SUPABASE_PROJECT_ID
- NEW_SUPABASE_URL
- NEW_SUPABASE_ANON_KEY (ou NEW_SUPABASE_PUBLISHABLE_KEY)
- NEW_SUPABASE_DB_URL **ou** NEW_SUPABASE_DB_HOST/USER/PASSWORD/NAME (+ PORT optionnel)

Optionnelles:
- NEW_SUPABASE_SERVICE_ROLE_KEY (ou NEW_SUPABASE_SECRET_KEY)
- BACKUP_SQL (chemin explicite du backup si non detecte)
- USERS_CSV (chemin explicite vers le CSV users, default: guildforce_users.csv)
- CONFIRM_RESET=YES (drop + recreate schema public)
- DATA_ONLY=YES (ne charge que INSERT/COPY/SETVAL)
- IMPORT_AUTH_USERS=YES (importe auth.users depuis le CSV)

## Scripts
- `scripts/migrate_lovable_to_new_supabase.sh`
- `scripts/migrate_lovable_to_new_supabase.ps1` (optionnel, Windows)

## Utilisation (bash)
```bash
./scripts/migrate_lovable_to_new_supabase.sh
```

## Utilisation (PowerShell)
```powershell
./scripts/migrate_lovable_to_new_supabase.ps1
```

## Ce que fait le script
1) Verifie les variables et les migrations.
2) `supabase link` puis `supabase db push`.
3) Optionnel: importe `auth.users` depuis un CSV (UUIDs preservés).
4) Detecte un backup SQL a la racine et tente une restauration si data.
5) Execute `scripts/sql/sanity_checks.sql`.
6) Loggue dans `logs/` avec un timestamp.

## Detection du backup SQL
Priorites:
1) `BACKUP_SQL` si defini
2) `backup.sql` a la racine
3) Un unique fichier `*.sql` a la racine
4) Un fichier `*backup*.sql` a la racine

## Si le backup contient schema + data
- Par defaut: le script execute tout le SQL (peut echouer si schema deja cree par migrations).
- Utilisez `DATA_ONLY=YES` pour extraire uniquement INSERT/COPY/SETVAL (best effort).

## Si le backup est schema-only
Le script ne restaure rien. Utilisez ce plan CSV:
1) Dans Lovable Cloud, exporter chaque table en CSV (Table Editor).
2) Dans Supabase target: importer table par table (Table Editor).
3) Verifier les sequences si necessaire (setval).

## Sanity checks
Le script execute `scripts/sql/sanity_checks.sql`:
- Nombre de tables par schema
- Nombre de policies par schema
- Tables avec RLS
- Extensions installees

## Post-migration (checklist)
- Auth providers: reconfigurer redirect URLs vers la nouvelle Supabase.
- Users: mots de passe non exportables -> prevoir reset password.
- Storage: migration manuelle des fichiers (download/upload).
- Edge Functions + secrets: reconfigurer.
- Verifs app: auth, CRUD, uploads.

## Import auth.users (OAuth Battle.net)
Si tu veux que les utilisateurs OAuth ne remarquent rien, il faut conserver les UUIDs auth.

Exemple:
- Mettre le CSV a la racine (par defaut `guildforce_users.csv`)
- Lancer avec `IMPORT_AUTH_USERS=YES`

Le CSV doit contenir les colonnes: `id,email,created_at,last_sign_in_at`.
