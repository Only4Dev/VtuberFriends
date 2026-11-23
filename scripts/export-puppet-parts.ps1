param([string]$Destination, [ValidateSet("cyan-dragon","jade-dragon","amber-dragon","thoxer-dragon","ember-dragon","patch-dragon","rose-dragon","frost-dragon")][string]$Pack="cyan-dragon")
$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$packPath=Join-Path $root ('src/VtuberFriends/wwwroot/puppets/'+$Pack)
if(-not $Destination){$Destination=Join-Path $root ('art/avatar-parts/'+$Pack)}
[IO.Directory]::CreateDirectory($Destination)|Out-Null
$manifest=Get-Content -LiteralPath (Join-Path $packPath 'rig.json') -Raw | ConvertFrom-Json
foreach($part in $manifest.parts){
 if($part.src){
  $name=$part.id+'.png'
  Copy-Item -LiteralPath (Join-Path $packPath $part.src) -Destination (Join-Path $Destination $name) -Force
  $part.src=$name
 } else {
  $c=$part.color
  $svg='<svg xmlns="http://www.w3.org/2000/svg" width="512" height="256"><rect width="512" height="256" fill="rgb('+($c[0..2] -join ',')+')"/></svg>'
  [IO.File]::WriteAllText((Join-Path $Destination ($part.id+'.svg')),$svg)
 }
}
$manifest | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath (Join-Path $Destination 'rig.json') -Encoding UTF8
Copy-Item -LiteralPath (Join-Path $packPath 'reference.png') -Destination (Join-Path $Destination 'reference.png') -Force
$mouthHelp=if($Pack -in @('amber-dragon','thoxer-dragon','ember-dragon','patch-dragon','rose-dragon','frost-dragon')){'head.png: cabeza completa con hocico intacto, sin boca ni dientes pintados. mouth.svg y tongue.svg son muestras de color: la boca real se genera como geometria interpolada. fang-left.png/fang-right.png: colmillos independientes que siguen el labio. brow-left.png/brow-right.png: cejas independientes.'}else{'head.png: cabeza SIN dientes. fangs.png: exactamente DOS colmillos. jaw.png: mandibula. lower-teeth.png: fila de seis dientes inferiores. tongue.png: lengua.'}
@"
PIEZAS ACTIVAS: $Pack
$(@($manifest.parts | Where-Object src).Count) capas PNG originales con transparencia, sin reducir a 768px. Cada nombre corresponde a una pieza del rig.
$mouthHelp
Los SVG planos representan capas de color/geometria, no requieren upscale. Los PNG de ojos mantienen fondo e iris/pupila separados.
reference.png es solo referencia completa, no una capa del rig.
rig.json contiene orden, jerarquia, posiciones y UV normalizados. No recortar ni cambiar proporcion del lienzo al hacer upscale: conservar margenes y alpha.
La app ya aprovecha texturas hasta 2048px y canvas $($manifest.canvas -join 'x'). Aumentar resolucion no recupera por si solo detalle perdido ni garantiza mas calidad.
Esta carpeta es una copia para edicion; no modifica automaticamente la aplicacion. El original activo esta en src/VtuberFriends/wwwroot/puppets/$Pack, relativo a la raiz del proyecto.
Si haces upscale, conserva los nombres de esta carpeta y todas las transparencias. Podremos importar el resultado manteniendo el registro.
"@ | Set-Content -LiteralPath (Join-Path $Destination 'LEEME.txt') -Encoding UTF8
Write-Output "Piezas exportadas: $Destination"
