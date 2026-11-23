$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$report = Get-Content -LiteralPath (Join-Path $root 'artifacts/organized-release.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$keep = [IO.Path]::GetFullPath($report.directory)
$distribution = Join-Path $root 'Distribucion'
$tools = Join-Path $root '.tools'
$candidates = @(
    Get-ChildItem -LiteralPath $distribution -Directory | Where-Object { $_.Name -match '^VtuberFriends-(?:0\.[67]\.0-)?\d{8}-\d{6}$' -and $_.FullName -ne $keep }
    Get-ChildItem -LiteralPath $tools -Directory | Where-Object { $_.Name -match '^(?:gui-smoke|visual-ui|token-probe)-[a-f0-9]{32}$' -or $_.Name -in @('baselines','reproducible-helper') }
)
$removed = @(); [long]$bytes = 0
foreach ($candidate in $candidates) {
    $path = [IO.Path]::GetFullPath($candidate.FullName)
    if (-not ($path.StartsWith($distribution + '\', [StringComparison]::OrdinalIgnoreCase) -or $path.StartsWith($tools + '\', [StringComparison]::OrdinalIgnoreCase))) { throw 'Cleanup escaped the workspace.' }
    if ($path -eq $keep -or $path -eq (Join-Path $distribution 'VtuberFriends')) { throw 'Protected installation.' }
    $items = @(Get-ChildItem -LiteralPath $path -Recurse -Force)
    if (($candidate.Attributes -band [IO.FileAttributes]::ReparsePoint) -or ($items | Where-Object { $_.Attributes -band [IO.FileAttributes]::ReparsePoint })) { throw 'Cleanup refuses linked directories.' }
    if ($path.StartsWith($distribution + '\', [StringComparison]::OrdinalIgnoreCase)) {
        # A generated release might have been used by a person since it was built.
        # Keep it if it contains any runtime state or personal sound files.
        $personal = $items | Where-Object { $_.Name -in @('config.json','.local') -or $_.Extension -eq '.dpapi' -or (-not $_.PSIsContainer -and $_.FullName -match '\\Sonidos\\' -and $_.Name -ne 'LEEME.txt') }
        if ($personal) { Write-Output ('Kept configured installation: ' + $candidate.Name); continue }
    }
    $size = ($items | Where-Object { -not $_.PSIsContainer } | Measure-Object -Property Length -Sum).Sum
    Remove-Item -LiteralPath $path -Recurse -Force
    $bytes += $size; $removed += $path.Substring($root.Length + 1)
}
$result = @{ removedDirectories = $removed; reclaimedBytes = $bytes; keptRelease = $keep; immutableZipBaselinesPreserved = $true; personalInstallationPreserved = $true }
$result | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $root 'artifacts/cleanup-report.json') -Encoding UTF8
Write-Output ('Removed {0} generated directories; reclaimed {1:N0} bytes. Personal data and all ZIP baselines preserved.' -f $removed.Count, $bytes)
