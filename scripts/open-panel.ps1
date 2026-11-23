param([int]$WaitSeconds = 0, [int]$Port = 0)
$ErrorActionPreference = 'Stop'
# This helper never needs or forwards the bot credential to the browser.
Remove-Item Env:VF_DISCORD_BOT_TOKEN -ErrorAction SilentlyContinue
$root = Split-Path -Parent $PSScriptRoot
$configPath = Join-Path $root 'config.json'
if ($Port -eq 0) {
$port = 17861
if (Test-Path -LiteralPath $configPath) { $port = (Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json).port }
}
$url = "http://127.0.0.1:$port/"
if ($WaitSeconds -gt 0) {
    $ready = $false
    for ($attempt = 0; $attempt -lt $WaitSeconds * 2; $attempt++) {
        try {
            $state = Invoke-RestMethod ($url + 'api/state') -TimeoutSec 1
            if ($null -ne $state.slots) { $ready = $true; break }
        } catch {}
        Start-Sleep -Milliseconds 500
    }
    if (-not $ready) { exit 1 }
}
$candidates = @(
    (Join-Path ([Environment]::GetFolderPath('ProgramFilesX86')) 'Microsoft/Edge/Application/msedge.exe'),
    (Join-Path ([Environment]::GetFolderPath('ProgramFiles')) 'Microsoft/Edge/Application/msedge.exe'),
    (Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'Microsoft/Edge/Application/msedge.exe')
)
$edge = $candidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if ($edge) {
    Start-Process -FilePath $edge -ArgumentList @("--app=$url", '--start-maximized') -WindowStyle Normal
} else {
    Start-Process $url
}
