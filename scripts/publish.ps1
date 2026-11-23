$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$dotnet = if (Test-Path (Join-Path $root '.tools/dotnet/dotnet.exe')) { Join-Path $root '.tools/dotnet/dotnet.exe' } else { 'dotnet' }
Push-Location -LiteralPath $root
try {
    & (Join-Path $PSScriptRoot 'build-launcher.ps1')
    & $dotnet publish src/VtuberFriends -c Release -r win-x64 --self-contained true -o artifacts/win-x64 --disable-build-servers -m:1 -p:UseSharedCompilation=false
    if ($LASTEXITCODE -ne 0) { throw 'Main application publish failed.' }
    & $dotnet publish src/VtuberFriends.Patch -c Release -r win-x64 --self-contained true -o artifacts/patch-runner --disable-build-servers -m:1 -p:UseSharedCompilation=false
    if ($LASTEXITCODE -ne 0) { throw 'Updater publish failed.' }
    & python scripts/make-organized-release.py
    if ($LASTEXITCODE -ne 0) { throw 'Clean release packaging failed.' }
    Write-Host 'Release ready. See artifacts/organized-release.json. No personal data was copied.'
} finally { Pop-Location }
