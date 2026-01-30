Param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$Root = Resolve-Path (Join-Path $PSScriptRoot '..')
$LogDir = Join-Path $Root 'logs'
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$Timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$LogFile = Join-Path $LogDir "migrate_lovable_to_new_supabase_$Timestamp.log"

function Log([string]$Message) {
  $line = "[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message
  $line | Tee-Object -FilePath $LogFile -Append
}

function Die([string]$Message) {
  Log "ERROR: $Message"
  exit 1
}

function Require-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    Die "Missing required command: $Name"
  }
}

$EnvFile = Join-Path $Root '.env'
if (-not (Test-Path $EnvFile)) {
  Die "Missing .env at repo root: $EnvFile"
}

# Load .env without echoing values
Get-Content $EnvFile | ForEach-Object {
  $line = $_
  if ($line -match '^\s*#' -or $line -match '^\s*$') { return }
  if ($line -match '^\s*([A-Z0-9_]+)\s*=\s*"?(.+?)"?\s*$') {
    $name = $Matches[1]
    $value = $Matches[2]
    [Environment]::SetEnvironmentVariable($name, $value, 'Process')
  }
}

$NEW_SUPABASE_PROJECT_ID = $env:NEW_SUPABASE_PROJECT_ID
$NEW_SUPABASE_URL = $env:NEW_SUPABASE_URL
$NEW_SUPABASE_ANON_KEY = if ($env:NEW_SUPABASE_ANON_KEY) { $env:NEW_SUPABASE_ANON_KEY } else { $env:NEW_SUPABASE_PUBLISHABLE_KEY }
$NEW_SUPABASE_SERVICE_ROLE_KEY = if ($env:NEW_SUPABASE_SERVICE_ROLE_KEY) { $env:NEW_SUPABASE_SERVICE_ROLE_KEY } else { $env:NEW_SUPABASE_SECRET_KEY }

$NEW_SUPABASE_DB_URL = if ($env:NEW_SUPABASE_DB_URL) { $env:NEW_SUPABASE_DB_URL } else { $env:DATABASE_URL }
$NEW_SUPABASE_DB_HOST = $env:NEW_SUPABASE_DB_HOST
$NEW_SUPABASE_DB_USER = $env:NEW_SUPABASE_DB_USER
$NEW_SUPABASE_DB_PASSWORD = $env:NEW_SUPABASE_DB_PASSWORD
$NEW_SUPABASE_DB_NAME = $env:NEW_SUPABASE_DB_NAME
$NEW_SUPABASE_DB_PORT = if ($env:NEW_SUPABASE_DB_PORT) { $env:NEW_SUPABASE_DB_PORT } else { '5432' }

if (-not $NEW_SUPABASE_PROJECT_ID) { Die 'Missing NEW_SUPABASE_PROJECT_ID in .env' }
if (-not $NEW_SUPABASE_URL) { Die 'Missing NEW_SUPABASE_URL in .env' }
if (-not $NEW_SUPABASE_ANON_KEY) { Die 'Missing NEW_SUPABASE_ANON_KEY or NEW_SUPABASE_PUBLISHABLE_KEY in .env' }

if (-not $NEW_SUPABASE_DB_URL) {
  if ($NEW_SUPABASE_DB_HOST -and $NEW_SUPABASE_DB_USER -and $NEW_SUPABASE_DB_PASSWORD -and $NEW_SUPABASE_DB_NAME) {
    $NEW_SUPABASE_DB_URL = "postgresql://$NEW_SUPABASE_DB_USER`:$NEW_SUPABASE_DB_PASSWORD@$NEW_SUPABASE_DB_HOST`:$NEW_SUPABASE_DB_PORT/$NEW_SUPABASE_DB_NAME"
  } else {
    Die 'Missing NEW_SUPABASE_DB_URL or NEW_SUPABASE_DB_HOST/USER/PASSWORD/NAME in .env'
  }
}

if (-not $NEW_SUPABASE_SERVICE_ROLE_KEY) {
  Log 'WARN: NEW_SUPABASE_SERVICE_ROLE_KEY missing. Some admin tasks may fail.'
}

Log 'Starting migration to new Supabase project.'
Log 'Project ref detected.'
Log 'App URL detected.'
Log 'DB connection detected (hidden).'

$MigrationsDir = Join-Path $Root 'supabase\migrations'
if (-not (Test-Path $MigrationsDir)) {
  Die "Missing migrations directory: $MigrationsDir"
}
if (-not (Get-ChildItem -Path $MigrationsDir -Filter '*.sql' -ErrorAction SilentlyContinue)) {
  Die "No migration files found in $MigrationsDir"
}

# Detect backup SQL in repo root
$BackupSql = $env:BACKUP_SQL
if (-not $BackupSql) {
  $backupDefault = Join-Path $Root 'backup.sql'
  if (Test-Path $backupDefault) {
    $BackupSql = $backupDefault
  } else {
    $rootSql = @(Get-ChildItem -Path $Root -Filter '*.sql' -File -ErrorAction SilentlyContinue)
    if ($rootSql.Count -eq 1) {
      $BackupSql = $rootSql[0].FullName
    } else {
      $backupCandidate = $rootSql | Where-Object { $_.Name -like '*backup*.sql' } | Select-Object -First 1
      if ($backupCandidate) { $BackupSql = $backupCandidate.FullName }
    }
  }
}

if ($BackupSql) {
  Log "Backup SQL detected: $([IO.Path]::GetFileName($BackupSql))"
} else {
  Log 'No backup SQL detected in repo root.'
}

Require-Command 'supabase'
Require-Command 'psql'

Log 'Linking Supabase project (interactive login may be required).'
& supabase link --project-ref $NEW_SUPABASE_PROJECT_ID | Tee-Object -FilePath $LogFile -Append

Log 'Pushing migrations to target database.'
& supabase db push | Tee-Object -FilePath $LogFile -Append

# Optional auth.users import from CSV (OAuth continuity)
$UsersCsv = if ($env:USERS_CSV) { $env:USERS_CSV } else { Join-Path $Root 'guildforce_users.csv' }
$ImportAuthUsers = $env:IMPORT_AUTH_USERS
$ImportAuthSql = Join-Path $Root 'scripts\\sql\\import_auth_users_from_csv.sql'
if ($ImportAuthUsers -eq 'YES') {
  if (-not (Test-Path $UsersCsv)) {
    Die \"IMPORT_AUTH_USERS=YES but users CSV not found: $UsersCsv\"
  }
  if (-not (Test-Path $ImportAuthSql)) {
    Die \"Missing SQL file for auth import: $ImportAuthSql\"
  }
  Log 'Importing auth.users from CSV (UUIDs preserved).'
  $csvPathRaw = ($UsersCsv -replace '\\','/')
  $importSqlTmp = Join-Path $LogDir "import_auth_users_$Timestamp.sql"
  (Get-Content $ImportAuthSql) -replace ":'csv_path'", "'$csvPathRaw'" | Set-Content -Path $importSqlTmp -NoNewline -Encoding UTF8
  & psql $NEW_SUPABASE_DB_URL -v ON_ERROR_STOP=1 -f $importSqlTmp | Tee-Object -FilePath $LogFile -Append
}

if ($BackupSql) {
  if ($env:CONFIRM_RESET -eq 'YES') {
    Log 'CONFIRM_RESET=YES detected. Dropping and recreating public schema.'
    & psql $NEW_SUPABASE_DB_URL -v ON_ERROR_STOP=1 -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role; GRANT ALL ON SCHEMA public TO postgres, service_role;" | Tee-Object -FilePath $LogFile -Append
  }

  Log 'Inspecting backup for data sections.'
  $hasData = $false
  if (Select-String -Path $BackupSql -Pattern '\b(INSERT\s+INTO|COPY)\b' -Quiet) { $hasData = $true }

  if ($hasData) {
    if ($env:DATA_ONLY -eq 'YES') {
      $profilesSql = Join-Path $LogDir "profiles_only_$Timestamp.sql"
      $profileLines = Select-String -Path $BackupSql -Pattern '^INSERT INTO public."profiles"'
      if ($profileLines) {
        $profileLines | ForEach-Object { $_.Line } | Set-Content -Path $profilesSql -NoNewline -Encoding UTF8
        if ((Get-Item $profilesSql).Length -gt 0) {
          Log 'Importing profiles from backup (FK prerequisites).'
          & psql $NEW_SUPABASE_DB_URL -v ON_ERROR_STOP=1 -f $profilesSql | Tee-Object -FilePath $LogFile -Append
        } else {
          Log 'WARN: profiles insert not found in backup.'
        }
      } else {
        Log 'WARN: profiles insert not found in backup.'
      }

      Log 'DATA_ONLY=YES detected. Extracting data statements only (best effort).'
      $dataOnlySql = Join-Path $LogDir "data_only_$Timestamp.sql"
      Set-Content -Path $dataOnlySql -Value '' -Encoding UTF8
      $inCopy = $false
      Get-Content $BackupSql | ForEach-Object {
        $line = $_
        if ($line -match '^COPY\s') { $inCopy = $true; Add-Content -Path $dataOnlySql -Value $line -Encoding UTF8; return }
        if ($inCopy) { Add-Content -Path $dataOnlySql -Value $line -Encoding UTF8; if ($line -match '^\\\.$') { $inCopy = $false }; return }
        if ($line -match '^INSERT\s+INTO\s') { Add-Content -Path $dataOnlySql -Value $line -Encoding UTF8; return }
        if ($line -match '^SELECT\s+pg_catalog\.setval') { Add-Content -Path $dataOnlySql -Value $line -Encoding UTF8; return }
      }

      if (-not (Test-Path $dataOnlySql) -or (Get-Item $dataOnlySql).Length -eq 0) {
        Die 'DATA_ONLY produced empty SQL. Disable DATA_ONLY or provide a data-only export.'
      }

      Log 'Restoring data-only SQL (best effort).'
      & psql $NEW_SUPABASE_DB_URL -v ON_ERROR_STOP=1 -f $dataOnlySql | Tee-Object -FilePath $LogFile -Append
    } else {
      Log 'Restoring full backup SQL.'
      & psql $NEW_SUPABASE_DB_URL -v ON_ERROR_STOP=1 -f $BackupSql | Tee-Object -FilePath $LogFile -Append
    }
  } else {
    Log 'Backup appears schema-only (no INSERT/COPY found). Skipping restore.'
  }
}

$ChecksSql = Join-Path $Root 'scripts\sql\sanity_checks.sql'
if (Test-Path $ChecksSql) {
  Log 'Running sanity checks.'
  & psql $NEW_SUPABASE_DB_URL -v ON_ERROR_STOP=1 -f $ChecksSql | Tee-Object -FilePath $LogFile -Append
} else {
  Log "Sanity checks file missing: $ChecksSql"
}

Log "Migration complete. Review logs at $LogFile"
