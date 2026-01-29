#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT_DIR/logs"
mkdir -p "$LOG_DIR"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
LOG_FILE="$LOG_DIR/migrate_lovable_to_new_supabase_${TIMESTAMP}.log"

log() {
  printf "[%s] %s\n" "$(date +"%Y-%m-%d %H:%M:%S")" "$*" | tee -a "$LOG_FILE"
}

die() {
  log "ERROR: $*"
  exit 1
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    die "Missing required command: $1"
  fi
}

ENV_FILE="$ROOT_DIR/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  die "Missing .env at repo root: $ENV_FILE"
fi

# Load env without echoing values.
set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

NEW_SUPABASE_PROJECT_ID="${NEW_SUPABASE_PROJECT_ID:-}"
NEW_SUPABASE_URL="${NEW_SUPABASE_URL:-}"
NEW_SUPABASE_ANON_KEY="${NEW_SUPABASE_ANON_KEY:-${NEW_SUPABASE_PUBLISHABLE_KEY:-}}"
NEW_SUPABASE_SERVICE_ROLE_KEY="${NEW_SUPABASE_SERVICE_ROLE_KEY:-${NEW_SUPABASE_SECRET_KEY:-}}"

NEW_SUPABASE_DB_URL="${NEW_SUPABASE_DB_URL:-${DATABASE_URL:-}}"
NEW_SUPABASE_DB_HOST="${NEW_SUPABASE_DB_HOST:-}"
NEW_SUPABASE_DB_USER="${NEW_SUPABASE_DB_USER:-}"
NEW_SUPABASE_DB_PASSWORD="${NEW_SUPABASE_DB_PASSWORD:-}"
NEW_SUPABASE_DB_NAME="${NEW_SUPABASE_DB_NAME:-}"
NEW_SUPABASE_DB_PORT="${NEW_SUPABASE_DB_PORT:-5432}"

[[ -n "$NEW_SUPABASE_PROJECT_ID" ]] || die "Missing NEW_SUPABASE_PROJECT_ID in .env"
[[ -n "$NEW_SUPABASE_URL" ]] || die "Missing NEW_SUPABASE_URL in .env"
[[ -n "$NEW_SUPABASE_ANON_KEY" ]] || die "Missing NEW_SUPABASE_ANON_KEY or NEW_SUPABASE_PUBLISHABLE_KEY in .env"

if [[ -z "$NEW_SUPABASE_DB_URL" ]]; then
  if [[ -n "$NEW_SUPABASE_DB_HOST" && -n "$NEW_SUPABASE_DB_USER" && -n "$NEW_SUPABASE_DB_PASSWORD" && -n "$NEW_SUPABASE_DB_NAME" ]]; then
    NEW_SUPABASE_DB_URL="postgresql://${NEW_SUPABASE_DB_USER}:${NEW_SUPABASE_DB_PASSWORD}@${NEW_SUPABASE_DB_HOST}:${NEW_SUPABASE_DB_PORT}/${NEW_SUPABASE_DB_NAME}"
  else
    die "Missing NEW_SUPABASE_DB_URL or NEW_SUPABASE_DB_HOST/USER/PASSWORD/NAME in .env"
  fi
fi

if [[ -z "$NEW_SUPABASE_SERVICE_ROLE_KEY" ]]; then
  log "WARN: NEW_SUPABASE_SERVICE_ROLE_KEY missing. Some admin tasks may fail."
fi

log "Starting migration to new Supabase project."
log "Project ref detected."
log "App URL detected."
log "DB connection detected (hidden)."

# Sanity: migrations exist
MIGRATIONS_DIR="$ROOT_DIR/supabase/migrations"
if [[ ! -d "$MIGRATIONS_DIR" ]]; then
  die "Missing migrations directory: $MIGRATIONS_DIR"
fi
if ! ls -1 "$MIGRATIONS_DIR"/*.sql >/dev/null 2>&1; then
  die "No migration files found in $MIGRATIONS_DIR"
fi

# Detect backup SQL file in repo root
BACKUP_SQL="${BACKUP_SQL:-}"
if [[ -z "$BACKUP_SQL" ]]; then
  if [[ -f "$ROOT_DIR/backup.sql" ]]; then
    BACKUP_SQL="$ROOT_DIR/backup.sql"
  else
    mapfile -t root_sql_files < <(find "$ROOT_DIR" -maxdepth 1 -type f -name "*.sql")
    if [[ "${#root_sql_files[@]}" -eq 1 ]]; then
      BACKUP_SQL="${root_sql_files[0]}"
    else
      for candidate in "${root_sql_files[@]}"; do
        if [[ "$(basename "$candidate")" == *backup*.sql ]]; then
          BACKUP_SQL="$candidate"
          break
        fi
      done
    fi
  fi
fi

if [[ -n "$BACKUP_SQL" ]]; then
  log "Backup SQL detected: $(basename "$BACKUP_SQL")"
else
  log "No backup SQL detected in repo root."
fi

# Ensure CLI tools
require_cmd supabase
require_cmd psql

# Link + push schema
log "Linking Supabase project (interactive login may be required)."
supabase link --project-ref "$NEW_SUPABASE_PROJECT_ID"

log "Pushing migrations to target database."
supabase db push

# Optional auth.users import from CSV (OAuth continuity)
USERS_CSV="${USERS_CSV:-$ROOT_DIR/guildforce_users.csv}"
IMPORT_AUTH_USERS="${IMPORT_AUTH_USERS:-}"
IMPORT_AUTH_SQL="$ROOT_DIR/scripts/sql/import_auth_users_from_csv.sql"
if [[ "$IMPORT_AUTH_USERS" == "YES" ]]; then
  if [[ ! -f "$USERS_CSV" ]]; then
    die "IMPORT_AUTH_USERS=YES but users CSV not found: $USERS_CSV"
  fi
  if [[ ! -f "$IMPORT_AUTH_SQL" ]]; then
    die "Missing SQL file for auth import: $IMPORT_AUTH_SQL"
  fi
  log "Importing auth.users from CSV (UUIDs preserved)."
  IMPORT_SQL_TMP="$LOG_DIR/import_auth_users_${TIMESTAMP}.sql"
  CSV_PATH_ESC=${USERS_CSV//\'/\'\'}
  sed "s|:'csv_path'|'$CSV_PATH_ESC'|g" "$IMPORT_AUTH_SQL" > "$IMPORT_SQL_TMP"
  psql "$NEW_SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f "$IMPORT_SQL_TMP"
fi

# Optional data restore
if [[ -n "$BACKUP_SQL" ]]; then
  if [[ "${CONFIRM_RESET:-}" == "YES" ]]; then
    log "CONFIRM_RESET=YES detected. Dropping and recreating public schema."
    psql "$NEW_SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role; GRANT ALL ON SCHEMA public TO postgres, service_role;"
  fi

  log "Inspecting backup for data sections."
  if rg -n "\\b(INSERT INTO|COPY)\\b" "$BACKUP_SQL" >/dev/null 2>&1 || grep -E "\\b(INSERT INTO|COPY)\\b" "$BACKUP_SQL" >/dev/null 2>&1; then
    if [[ "${DATA_ONLY:-}" == "YES" ]]; then
      PROFILES_SQL="$ROOT_DIR/logs/profiles_only_${TIMESTAMP}.sql"
      if rg '^INSERT INTO public."profiles"' "$BACKUP_SQL" > "$PROFILES_SQL" 2>/dev/null; then
        if [[ -s "$PROFILES_SQL" ]]; then
          log "Importing profiles from backup (FK prerequisites)."
          psql "$NEW_SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f "$PROFILES_SQL"
        else
          log "WARN: profiles insert not found in backup."
        fi
      else
        log "WARN: failed to extract profiles insert from backup."
      fi

      log "DATA_ONLY=YES detected. Extracting data statements only (best effort)."
      DATA_ONLY_SQL="$ROOT_DIR/logs/data_only_${TIMESTAMP}.sql"
      awk '
        BEGIN { in_copy=0 }
        /^COPY[[:space:]]/ { in_copy=1; print; next }
        in_copy { print; if ($0 ~ /^\\\\\.$/) { in_copy=0 } ; next }
        /^INSERT[[:space:]]+INTO[[:space:]]/ { print; next }
        /^SELECT[[:space:]]+pg_catalog\\.setval/ { print; next }
      ' "$BACKUP_SQL" > "$DATA_ONLY_SQL"

      if [[ ! -s "$DATA_ONLY_SQL" ]]; then
        die "DATA_ONLY produced empty SQL. Disable DATA_ONLY or provide a data-only export."
      fi

      log "Restoring data-only SQL (best effort)."
      psql "$NEW_SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f "$DATA_ONLY_SQL"
    else
      log "Restoring full backup SQL."
      psql "$NEW_SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f "$BACKUP_SQL"
    fi
  else
    log "Backup appears schema-only (no INSERT/COPY found). Skipping restore."
  fi
fi

# Sanity checks
CHECKS_SQL="$ROOT_DIR/scripts/sql/sanity_checks.sql"
if [[ -f "$CHECKS_SQL" ]]; then
  log "Running sanity checks."
  psql "$NEW_SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f "$CHECKS_SQL"
else
  log "Sanity checks file missing: $CHECKS_SQL"
fi

log "Migration complete. Review logs at $LOG_FILE"
