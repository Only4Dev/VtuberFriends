$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$vswhere=Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio/Installer/vswhere.exe'
$install=& $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
if(!$install){throw 'Instala las herramientas C++ de Visual Studio para compilar el lanzador nativo.'}
$batch=Join-Path $root '.tools/build-launcher.cmd'
[IO.Directory]::CreateDirectory((Join-Path $root '.tools'))|Out-Null
[IO.Directory]::CreateDirectory((Join-Path $root 'artifacts'))|Out-Null
$vcvars=Join-Path $install 'VC/Auxiliary/Build/vcvars64.bat'
[IO.File]::WriteAllLines($batch,@('@echo off',('call "'+$vcvars+'" >nul'),'if errorlevel 1 exit /b 1','cl /nologo /O1 /MT src\launcher\launcher.c /Fe:artifacts\VtuberFriends-launcher.exe /Fo:artifacts\launcher.obj /link /SUBSYSTEM:WINDOWS user32.lib'))
Push-Location -LiteralPath $root
try{& cmd /c $batch;if($LASTEXITCODE -ne 0){throw 'No se pudo compilar el lanzador.'}}finally{Pop-Location}
