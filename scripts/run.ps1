param([switch]$Demo, [switch]$Doctor, [switch]$ResetToken, [switch]$NoPanel, [switch]$UseExistingData, [string]$DataDirectory)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$project = Join-Path $root 'src/VtuberFriends/VtuberFriends.csproj'
$development = Test-Path -LiteralPath $project
$isolatedDev = $development -and -not $UseExistingData
$devHome = Join-Path $root '.local/dev'
$configFile = if ($isolatedDev) { Join-Path $devHome 'config.json' } else { Join-Path $root 'config.json' }
$dotnet = if (Test-Path (Join-Path $root '.tools/dotnet/dotnet.exe')) { Join-Path $root '.tools/dotnet/dotnet.exe' } else { 'dotnet' }
# A server already on this port would make the browser show that other build.
# Check before building, reading credentials or opening any panel.
if (-not $Doctor) {
    $port = 17861
    $settingsPath = $configFile
    if (-not $Demo -and (Test-Path -LiteralPath $settingsPath)) {
        $settings = Get-Content -LiteralPath $settingsPath -Raw | ConvertFrom-Json
        if ($settings.port) { $port = [int]$settings.port }
    }
    $probe = New-Object Net.Sockets.TcpClient
    $occupied = $false
    try { $occupied = $probe.ConnectAsync('127.0.0.1', $port).Wait(500) -and $probe.Connected } catch {} finally { $probe.Dispose() }
    if ($occupied) {
        throw "Ya hay una app usando el puerto $port. Cierra VtuberFriends desde Configuracion > Cerrar aplicacion y ejecuta este script otra vez. No se abrira un panel de otra version."
    }
}
# In the repository always compile sources, even if someone copied a release EXE here.
if ($development) {
    Write-Host 'DEV: compilando el codigo actual del repositorio...'
    & $dotnet build $project --disable-build-servers -m:1 -p:UseSharedCompilation=false
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo compilar DEV. No se abrira una version anterior.' }
}
. (Join-Path $PSScriptRoot 'token-store.ps1')
$previousToken = $env:VF_DISCORD_BOT_TOKEN
$secret = $null
try {
    if (-not $Demo -and -not $Doctor -and -not $isolatedDev) {
        if ($ResetToken) { $token = $null }
        else {
            $token = Read-VfToken -Root $root
            if ([string]::IsNullOrWhiteSpace($token)) { $token = $previousToken }
        }
        if ([string]::IsNullOrWhiteSpace($token)) {
            $secret = Read-Host 'Token del bot (se guardara cifrado para tu usuario Windows)' -AsSecureString
        } elseif (-not (Test-Path -LiteralPath (Join-Path $root '.local/bot-token.dpapi'))) {
            $secret = ConvertTo-SecureString -String $token -AsPlainText -Force
        }
        if ($null -ne $secret) {
            Save-VfToken -Root $root -Secret $secret
            $token = Read-VfToken -Root $root
            Write-Host 'Token guardado cifrado. No tendras que introducirlo en cada inicio.'
        }
        $env:VF_DISCORD_BOT_TOKEN = $token
        $token = $null
    }
    if (-not $Doctor -and -not $NoPanel) {
        $panelScript = Join-Path $PSScriptRoot 'open-panel.ps1'
        Start-Process powershell.exe -ArgumentList @('-NoProfile','-File', ('"' + $panelScript + '"'), '-WaitSeconds','60','-Port',"$port") -WindowStyle Hidden
    }
    $portable = Join-Path $root 'VtuberFriends.exe'
    if (-not $development -and (Test-Path -LiteralPath $portable)) {
        $appArgs = @()
        if ($Demo) { $appArgs += '--demo' }
        elseif ($Doctor) { $appArgs += '--doctor' }
        else { $appArgs += @('--config', (Join-Path $root 'config.json')) }
        $appArgs += '--no-panel'
        & $portable @appArgs
    } else {
        $runArgs = @('run', '--no-build', '--project', $project, '--', '--no-panel')
        if ($Demo) { $runArgs += '--demo' }
        elseif ($Doctor) { $runArgs += '--doctor' }
        else { $runArgs += @('--config', $configFile) }
        if ($isolatedDev) { $runArgs += @('--data-dir', $(if($DataDirectory){$DataDirectory}else{Join-Path $devHome 'data'}), '--dev'); Write-Host 'DEV: datos aislados en .local/dev; no se carga ni borra la configuracion de uso normal.' }
        Push-Location -LiteralPath $root
        try { & $dotnet @runArgs } finally { Pop-Location }
    }
    if ($LASTEXITCODE -ne 0) { throw "La app termino con codigo $LASTEXITCODE" }
} finally {
    $env:VF_DISCORD_BOT_TOKEN = $previousToken
    $token = $null
    if ($null -ne $secret) { $secret.Dispose() }
}
