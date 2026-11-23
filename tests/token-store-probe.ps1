$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
. (Join-Path $root 'scripts/token-store.ps1')
$testRoot = Join-Path $root ('.tools/token-probe-' + [Guid]::NewGuid().ToString('N'))
$dummy = 'FAKE-TEST-TOKEN-NOT-A-CREDENTIAL'
$secure = ConvertTo-SecureString $dummy -AsPlainText -Force
try {
    Save-VfToken -Root $testRoot -Secret $secure
    $file = Join-Path $testRoot '.local/bot-token.dpapi'
    if ([IO.File]::ReadAllText($file).Contains($dummy)) { throw 'Token en texto plano.' }
    if ((Read-VfToken -Root $testRoot) -cne $dummy) { throw 'Fallo de lectura.' }
    # Fresh Windows PowerShell 5.1 process: proves persistence beyond the current window.
    $helper = (Join-Path $root 'scripts/token-store.ps1').Replace("'", "''")
    $escapedRoot = $testRoot.Replace("'", "''")
    $check = ". '$helper'; if ((Read-VfToken -Root '$escapedRoot') -cne 'FAKE-TEST-TOKEN-NOT-A-CREDENTIAL') { exit 1 }"
    $encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($check))
    & powershell.exe -NoProfile -NonInteractive -EncodedCommand $encoded
    if ($LASTEXITCODE -ne 0) { throw 'Fallo en una nueva ventana PowerShell 5.1.' }
    Write-Output 'PASS: token ficticio cifrado, recuperado en otro proceso Windows PowerShell 5.1.'
} finally {
    $secure.Dispose()
    $file = Join-Path $testRoot '.local/bot-token.dpapi'
    if (Test-Path -LiteralPath $file) { Remove-Item -LiteralPath $file }
}
