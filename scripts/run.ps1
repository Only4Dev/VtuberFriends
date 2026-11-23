param([switch]$Demo, [switch]$Doctor, [switch]$ResetToken, [switch]$NoPanel)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot 'token-store.ps1')
$previousToken = $env:VF_DISCORD_BOT_TOKEN
$secret = $null
try {
    if (-not $Demo -and -not $Doctor) {
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
        Start-Process powershell.exe -ArgumentList @('-NoProfile','-File', ('"' + $panelScript + '"'), '-WaitSeconds','60') -WindowStyle Hidden
    }
    $portable = Join-Path $root 'VtuberFriends.exe'
    if (Test-Path -LiteralPath $portable) {
        $appArgs = @()
        if ($Demo) { $appArgs += '--demo' }
        elseif ($Doctor) { $appArgs += '--doctor' }
        else { $appArgs += @('--config', (Join-Path $root 'config.json')) }
        $appArgs += '--no-panel'
        & $portable @appArgs
    } else {
        $project = Join-Path $root 'src/VtuberFriends/VtuberFriends.csproj'
        $dotnet = if (Test-Path (Join-Path $root '.tools/dotnet/dotnet.exe')) { Join-Path $root '.tools/dotnet/dotnet.exe' } else { 'dotnet' }
        $runArgs = @('run', '--project', $project, '--', '--no-panel')
        if ($Demo) { $runArgs += '--demo' }
        elseif ($Doctor) { $runArgs += '--doctor' }
        else { $runArgs += @('--config', (Join-Path $root 'config.json')) }
        Push-Location -LiteralPath $root
        try { & $dotnet @runArgs } finally { Pop-Location }
    }
    if ($LASTEXITCODE -ne 0) { throw "La app termino con codigo $LASTEXITCODE" }
} finally {
    $env:VF_DISCORD_BOT_TOKEN = $previousToken
    $token = $null
    if ($null -ne $secret) { $secret.Dispose() }
}
