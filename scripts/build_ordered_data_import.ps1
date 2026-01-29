Param(
  [string]$BackupSql = "guildforce_full_backup.sql",
  [string]$OutFile = "logs/ordered_data_only.sql"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$resolvedBackup = (Resolve-Path -Path $BackupSql).Path
if (-not (Test-Path $resolvedBackup)) {
  throw "Backup SQL not found: $BackupSql"
}

$utf8Strict = New-Object System.Text.UTF8Encoding($false, $true)
try {
  $allLines = [System.IO.File]::ReadAllLines($resolvedBackup, $utf8Strict)
} catch {
  $sourceEncoding = [System.Text.Encoding]::GetEncoding(1252)
  $allLines = [System.IO.File]::ReadAllLines($resolvedBackup, $sourceEncoding)
}

$tablesInBackup = $allLines |
  Where-Object { $_ -match '^INSERT INTO public\."([^"]+)"' } |
  ForEach-Object { $Matches[1] } |
  Sort-Object -Unique

$order = @(
  'profiles',
  'user_roles',
  'guilds',
  'rosters',
  'guild_members',
  'guild_permissions',
  'roster_access_rules',
  'guild_activity_logs',
  'guild_roster_cache',
  'wow_characters',
  'wow_guild_memberships',
  'class_wishes',
  'guild_polls',
  'guild_poll_sections',
  'guild_poll_questions',
  'guild_poll_responses',
  'poll_results_access_rules',
  'forum_categories',
  'forum_topics',
  'forum_posts',
  'forum_reactions',
  'forum_notifications',
  'forum_topic_subscriptions',
  'bug_reports',
  'account_deletion_requests',
  'battlenet_tokens',
  'legal_pages',
  'patch_notes',
  'raid_effects'
)

$orderedTables = @()
foreach ($t in $order) {
  if ($tablesInBackup -contains $t) { $orderedTables += $t }
}
foreach ($t in $tablesInBackup) {
  if (-not ($orderedTables -contains $t)) { $orderedTables += $t }
}

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$linesOut = New-Object System.Collections.Generic.List[string]

foreach ($table in $orderedTables) {
  $prefix = 'INSERT INTO public."' + $table + '"'
  $lines = $allLines | Where-Object { $_.StartsWith($prefix) }
  foreach ($l in $lines) {
    # Strip problematic control characters (e.g., U+008D)
    $clean = $l -replace [char]0x008D, ''
    if ($table -eq 'guild_roster_cache') {
      $clean = $clean -replace '\"is_guild_master\":(true|false),', ''
    }
    $linesOut.Add($clean)
  }
}

$dir = Split-Path -Parent $OutFile
if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
[System.IO.File]::WriteAllLines($OutFile, $linesOut, $utf8NoBom)

Write-Host "Wrote $($linesOut.Count) INSERT lines to $OutFile"
