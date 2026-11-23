$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
& (Join-Path $root 'artifacts/win-x64/VtuberFriends.exe') --doctor
if ($LASTEXITCODE -ne 0) { throw 'Doctor portable fallo.' }
& (Join-Path $PSScriptRoot 'gui-smoke.ps1')