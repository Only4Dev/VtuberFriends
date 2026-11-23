$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$local = Join-Path $root '.tools/dotnet/dotnet.exe'
$command = Get-Command dotnet -ErrorAction SilentlyContinue
$dotnet = if (Test-Path $local) { $local } elseif ($command) { $command.Source } else { $null }
if ($dotnet) {
    $sdks = & $dotnet --list-sdks
    if ($sdks -match '^10\.') { Write-Output $sdks; Write-Output '.NET 10 ya disponible.'; exit 0 }
}
$tools = Join-Path $root '.tools'
New-Item -ItemType Directory -Path $tools -Force | Out-Null
$installer = Join-Path $tools 'dotnet-install.ps1'
Invoke-WebRequest 'https://dot.net/v1/dotnet-install.ps1' -OutFile $installer
& $installer -Channel '10.0' -Quality GA -InstallDir (Join-Path $tools 'dotnet') -NoPath
if ($LASTEXITCODE -ne 0) { throw 'Falló la instalación de .NET 10.' }
& $local --list-sdks
