$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$dotnet = if (Test-Path (Join-Path $root '.tools/dotnet/dotnet.exe')) { Join-Path $root '.tools/dotnet/dotnet.exe' } else { 'dotnet' }
$out = Join-Path $root 'artifacts/win-x64'
Push-Location -LiteralPath $root
try { & $dotnet publish (Join-Path $root 'src/VtuberFriends/VtuberFriends.csproj') -c Release -r win-x64 --self-contained true -o $out } finally { Pop-Location }
if ($LASTEXITCODE -ne 0) { throw 'Falló publish.' }
Copy-Item -LiteralPath (Join-Path $root 'config.example.json') -Destination $out
[IO.Directory]::CreateDirectory((Join-Path $out 'scripts')) | Out-Null
foreach ($name in @('run.ps1','token-store.ps1','open-panel.ps1')) { Copy-Item -LiteralPath (Join-Path $PSScriptRoot $name) -Destination (Join-Path $out 'scripts') }
Write-Output "Portable: $out. Copia config.example.json a config.json y ejecuta scripts/run.ps1; pedira el token solo la primera vez."

foreach ($name in @('Abrir panel.cmd','Iniciar VtuberFriends.cmd')) { Copy-Item -LiteralPath (Join-Path $root $name) -Destination $out }

[IO.Directory]::CreateDirectory((Join-Path $out 'Sonidos')) | Out-Null
Copy-Item -LiteralPath (Join-Path $root 'Sonidos/LEEME.txt') -Destination (Join-Path $out 'Sonidos')

& python (Join-Path $PSScriptRoot 'make-distribution.py')
if ($LASTEXITCODE -ne 0) { throw 'No se pudo preparar la distribucion limpia.' }
