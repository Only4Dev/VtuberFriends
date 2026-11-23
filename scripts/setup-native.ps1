$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$target = Join-Path $root 'native/win-x64'
$downloads = Join-Path $root '.tools/downloads'
New-Item -ItemType Directory -Path $target,$downloads -Force | Out-Null
$assets = @(
    @{ Url='https://github.com/discord/libdave/releases/download/v1.2.1/cpp/libdave-Windows-X64-boringssl.zip'; File='libdave-1.2.1.zip'; Names=@('libdave.dll') },
    @{ Url='https://raw.githubusercontent.com/discord-net/Discord.Net/3.20.2/voice-natives/vnext_natives_win32_x64.zip'; File='discord-net-3.20.2-natives.zip'; Names=@('libopus.dll','libsodium.dll') }
)
Add-Type -AssemblyName System.IO.Compression.FileSystem
$manifest = @()
foreach ($asset in $assets) {
    $zipPath = Join-Path $downloads $asset.File
    Invoke-WebRequest -Uri $asset.Url -OutFile $zipPath
    $zip = [IO.Compression.ZipFile]::OpenRead($zipPath)
    try {
        foreach ($name in $asset.Names) {
            $entry = $zip.Entries | Where-Object { $_.Name -eq $name } | Select-Object -First 1
            if (-not $entry) { throw "Falta $name en $($asset.Url)" }
            $outputName = if ($name -eq 'libopus.dll') { 'opus.dll' } else { $name }
            $dest = Join-Path $target $outputName
            [IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $dest, $true)
            $manifest += [ordered]@{ file=$outputName; source=$asset.Url; sha256=(Get-FileHash -LiteralPath $dest -Algorithm SHA256).Hash }
        }
    } finally { $zip.Dispose() }
}
$manifest | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $target 'manifest.json') -Encoding utf8
Write-Output 'Nativas instaladas localmente. Ejecuta scripts/run.ps1 -Doctor.'
