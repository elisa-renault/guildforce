Param(
  [string]$WrapperPath = "$env:TEMP\import_with_replica.sql",
  [string]$DbUrl = $env:NEW_SUPABASE_DB_URL
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not (Test-Path $WrapperPath)) {
  throw "Wrapper not found: $WrapperPath"
}
if (-not $DbUrl) {
  throw "NEW_SUPABASE_DB_URL is not set"
}

# Get the problematic INSERT line
$lines = Get-Content $WrapperPath
$idx = $lines | Select-String -Pattern '^INSERT INTO public\."wow_guild_memberships"' | Select-Object -First 1
if (-not $idx) { throw 'wow_guild_memberships INSERT not found in wrapper' }
$line = $idx.Line

# Extract JSON array between first '[' and last ']'
$start = $line.IndexOf('[')
$end = $line.LastIndexOf(']')
if ($start -lt 0 -or $end -lt 0 -or $end -le $start) {
  throw 'Failed to extract JSON array from INSERT line'
}
$json = $line.Substring($start, $end - $start + 1)
$json = $json.Replace("'", "''")

# Fetch columns (exclude generated column)
$colsRaw = & psql $DbUrl -At -c "select a.attname, format_type(a.atttypid, a.atttypmod) as typ from pg_attribute a join pg_class c on a.attrelid=c.oid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='wow_guild_memberships' and a.attnum>0 and not a.attisdropped and a.attname <> 'is_guild_master' order by a.attnum;"
if (-not $colsRaw) { throw 'Failed to read wow_guild_memberships columns' }

$colNames = @()
$colDefs = @()
$colsRaw -split "`n" | ForEach-Object {
  if ($_ -match '^(.*?)\|(.*)$') {
    $name = $Matches[1]
    $typ = $Matches[2]
    $colNames += '"' + $name + '"'
    $colDefs += '"' + $name + '" ' + $typ
  }
}

$colsList = $colNames -join ', '
$defsList = $colDefs -join ', '

$newLine = @"
INSERT INTO public."wow_guild_memberships" ($colsList) SELECT * FROM json_to_recordset('$json') AS x($defsList);
"@

# Replace line in wrapper
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$updated = $lines -replace [regex]::Escape($line), $newLine
[System.IO.File]::WriteAllLines($WrapperPath, $updated, $utf8NoBom)

Write-Host "Rewrote wow_guild_memberships INSERT in $WrapperPath"
