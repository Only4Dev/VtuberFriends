function Save-VfToken {
    param([Parameter(Mandatory=$true)][string]$Root, [Parameter(Mandatory=$true)][Security.SecureString]$Secret)
    if ($env:OS -ne 'Windows_NT') { throw 'El almacenamiento de token requiere Windows.' }
    if ($Secret.Length -eq 0) { throw 'El token esta vacio.' }
    $directory = Join-Path $Root '.local'
    [IO.Directory]::CreateDirectory($directory) | Out-Null
    $encrypted = ConvertFrom-SecureString -SecureString $Secret
    [IO.File]::WriteAllText((Join-Path $directory 'bot-token.dpapi'), $encrypted, [Text.Encoding]::ASCII)
}
function Read-VfToken {
    param([Parameter(Mandatory=$true)][string]$Root)
    $file = Join-Path $Root '.local/bot-token.dpapi'
    if (-not (Test-Path -LiteralPath $file)) { return $null }
    try {
        $secret = ConvertTo-SecureString -String ([IO.File]::ReadAllText($file)) -ErrorAction Stop
        try { return [Net.NetworkCredential]::new('', $secret).Password }
        finally { $secret.Dispose() }
    } catch { throw 'No se pudo abrir el token guardado. Usa run.ps1 -ResetToken con tu usuario de Windows.' }
}
