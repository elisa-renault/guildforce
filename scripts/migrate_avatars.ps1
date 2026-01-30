Param(
  [string]$DbUrl = $env:NEW_SUPABASE_DB_URL,
  [string]$SupabaseUrl = $env:NEW_SUPABASE_URL,
  [string]$ServiceRoleKey = $env:NEW_SUPABASE_SERVICE_ROLE_KEY,
  [string]$Bucket = '',
  [string]$Table = 'public.profiles',
  [string]$Column = 'avatar_url',
  [string]$TempDir = (Join-Path $env:TEMP 'guildforce-avatar-migrate'),
  [string]$EnvFile = '.env',
  [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Load-EnvFile {
  param([string]$Path)
  if (-not (Test-Path $Path)) { return }
  $lines = Get-Content -Path $Path -ErrorAction Stop
  foreach ($line in $lines) {
    if ($line -match '^\s*$') { continue }
    if ($line -match '^\s*#') { continue }
    if ($line -notmatch '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$') { continue }
    $name = $Matches[1]
    $raw = $Matches[2].Trim()
    if ($raw.StartsWith('"') -and $raw.EndsWith('"')) {
      $raw = $raw.Substring(1, $raw.Length - 2)
    } elseif ($raw.StartsWith("'") -and $raw.EndsWith("'")) {
      $raw = $raw.Substring(1, $raw.Length - 2)
    }
    [Environment]::SetEnvironmentVariable($name, $raw)
  }
}

if (-not $DbUrl -or -not $SupabaseUrl -or -not $ServiceRoleKey) {
  Load-EnvFile -Path $EnvFile
  if (-not $DbUrl) { $DbUrl = $env:NEW_SUPABASE_DB_URL }
  if (-not $SupabaseUrl) { $SupabaseUrl = $env:NEW_SUPABASE_URL }
  if (-not $ServiceRoleKey) { $ServiceRoleKey = $env:NEW_SUPABASE_SERVICE_ROLE_KEY }
}

if (-not $DbUrl) { throw 'Missing NEW_SUPABASE_DB_URL' }
if (-not $SupabaseUrl) { throw 'Missing NEW_SUPABASE_URL' }
if (-not $ServiceRoleKey) { throw 'Missing NEW_SUPABASE_SERVICE_ROLE_KEY' }

if (-not (Test-Path $TempDir)) {
  New-Item -ItemType Directory -Force -Path $TempDir | Out-Null
}

$schema = 'public'
$tableName = $Table
if ($Table -match '^([A-Za-z0-9_]+)\.([A-Za-z0-9_]+)$') {
  $schema = $Matches[1]
  $tableName = $Matches[2]
}
if ($schema -notmatch '^[A-Za-z0-9_]+$' -or $tableName -notmatch '^[A-Za-z0-9_]+$') {
  throw "Invalid table name: $Table"
}
if ($Column -notmatch '^[A-Za-z0-9_]+$') {
  throw "Invalid column name: $Column"
}

$quotedTable = '"' + $schema + '"."' + $tableName + '"'
$quotedColumn = '"' + $Column + '"'

$sqlList = "select distinct $quotedColumn from $quotedTable where $quotedColumn is not null and $quotedColumn <> '';"
$urls = & psql $DbUrl -At -F "`t" -c $sqlList 2>$null
if ($LASTEXITCODE -ne 0) { throw 'psql failed while fetching avatar_url list' }

$urls = $urls | Where-Object { $_ -match '^https?://.*/storage/v1/object/public/' }
if (-not $urls -or $urls.Count -eq 0) {
  Write-Host 'No avatar URLs found.'
  exit 0
}

$newBase = $SupabaseUrl.TrimEnd('/')

$map = New-Object System.Collections.Generic.List[object]
$failed = New-Object System.Collections.Generic.List[string]

Add-Type -AssemblyName System.Net.Http
$client = [System.Net.Http.HttpClient]::new()
$client.Timeout = [TimeSpan]::FromSeconds(120)
$client.DefaultRequestHeaders.Add('apikey', $ServiceRoleKey)
$client.DefaultRequestHeaders.Authorization = New-Object System.Net.Http.Headers.AuthenticationHeaderValue('Bearer', $ServiceRoleKey)
$client.DefaultRequestHeaders.Add('x-upsert', 'true')

foreach ($url in $urls) {
  $clean = $url.Split('?')[0]
  $match = [regex]::Match($clean, '^https?://[^/]+/storage/v1/object/public/([^/]+)/(.+)$')
  if (-not $match.Success) { continue }

  $bucketName = $match.Groups[1].Value
  $rel = $match.Groups[2].Value

  if ($Bucket -and ($bucketName -ne $Bucket)) { continue }
  if ([string]::IsNullOrWhiteSpace($rel)) { continue }

  $destPublic = "$newBase/storage/v1/object/public/$bucketName/$rel"
  $uploadUrl = "$newBase/storage/v1/object/$bucketName/$rel"

  if ($DryRun) {
    $map.Add([PSCustomObject]@{ old = $url; new = $destPublic })
    continue
  }

  $tmp = Join-Path $TempDir ([System.IO.Path]::GetRandomFileName())
  try {
    Invoke-WebRequest -Uri $url -OutFile $tmp -UseBasicParsing
    $ext = [System.IO.Path]::GetExtension($rel).ToLowerInvariant()
    $contentType = switch ($ext) {
      '.png' { 'image/png' }
      '.webp' { 'image/webp' }
      '.gif' { 'image/gif' }
      '.jpg' { 'image/jpeg' }
      '.jpeg' { 'image/jpeg' }
      default { 'application/octet-stream' }
    }

    $bytes = [System.IO.File]::ReadAllBytes($tmp)
    $content = New-Object System.Net.Http.ByteArrayContent(,$bytes)
    $content.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse($contentType)

    $resp = $client.PutAsync($uploadUrl, $content).Result
    if (-not $resp.IsSuccessStatusCode) {
      $failed.Add($url)
      continue
    }

    $map.Add([PSCustomObject]@{ old = $url; new = $destPublic })
  } catch {
    $failed.Add($url)
  } finally {
    Remove-Item $tmp -ErrorAction SilentlyContinue
  }
}

$mapPath = Join-Path $TempDir 'avatar_map.csv'
$map | Export-Csv -NoTypeInformation -Path $mapPath

$mapPathSql = $mapPath.Replace('\', '/')
$updateSqlPath = Join-Path $TempDir 'update_avatars.sql'
$updateSql = @'
create temp table avatar_map(old text, new text);
\copy avatar_map (old, new) from '{0}' with (format csv, header true);
update "{1}"."{2}" t
set "{3}" = m.new
from avatar_map m
where t."{3}" = m.old;
'@ -f $mapPathSql, $schema, $tableName, $Column
[System.IO.File]::WriteAllText($updateSqlPath, $updateSql, (New-Object System.Text.UTF8Encoding($false)))

& psql $DbUrl -v ON_ERROR_STOP=1 -f $updateSqlPath | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'psql failed while updating avatar URLs' }

Write-Host "Updated $($map.Count) avatar URLs."
if ($failed.Count -gt 0) {
  Write-Host "Failed downloads/uploads: $($failed.Count)"
}
