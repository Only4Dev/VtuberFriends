$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$port = 17862
$url = "http://127.0.0.1:$port"
if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) { throw 'Puerto de prueba ocupado.' }
$exe = Join-Path $root 'artifacts/win-x64/VtuberFriends.exe'
$data = Join-Path $root ('.tools/gui-smoke-' + [Guid]::NewGuid().ToString('N'))
$process = Start-Process -FilePath $exe -ArgumentList @('--demo','--port',"$port",'--data-dir', $data) -WindowStyle Hidden -RedirectStandardOutput (Join-Path $root 'artifacts/gui-smoke.stdout.log') -RedirectStandardError (Join-Path $root 'artifacts/gui-smoke.stderr.log') -PassThru
try {
    $ready = $false
    for ($i=0; $i -lt 40; $i++) {
        try { $state = Invoke-RestMethod "$url/api/state"; $ready = $true; break } catch { Start-Sleep -Milliseconds 150 }
    }
    if (-not $ready) { throw 'Demo no responde.' }
    if (@($state.slots).Count -ne 8 -or @($state.participants).Count -ne 2 -or @($state.slots | Where-Object enabled).Count -ne 0) { throw 'Elenco inicial incorrecto.' }
    $soundDirectory=Join-Path $data 'Sonidos'
    [IO.Directory]::CreateDirectory($soundDirectory) | Out-Null
    $sample=Invoke-WebRequest "$url/media/default-entry.wav"
    [IO.File]::WriteAllBytes((Join-Path $soundDirectory 'entrada-test.wav'), $sample.Content)
    [IO.File]::WriteAllText((Join-Path $soundDirectory 'invalid.mp3'), 'not audio')
    $library=@(Invoke-RestMethod "$url/api/sounds")
    if($library.Count -ne 1 -or $library[0].name -ne 'entrada-test.wav'){throw 'Biblioteca no detecta o filtra archivos.'}
    $soundId=$library[0].soundId
    if((Invoke-WebRequest "$url/media/sounds/$soundId").StatusCode -ne 200){throw 'Sonido de biblioteca inaccesible.'}
    Remove-Item -LiteralPath (Join-Path $soundDirectory 'entrada-test.wav')
    $removedLibrary=Invoke-RestMethod "$url/api/sounds"
    if($removedLibrary.Count -ne 0){throw 'Biblioteca no detecta eliminacion.'}
    if((Invoke-WebRequest "$url/media/sounds/$soundId" -SkipHttpErrorCheck).StatusCode -ne 404){throw 'Sonido retirado aun disponible.'}
    Write-Output 'PASS: biblioteca portable detecta altas/bajas, filtra contenido invalido y sirve audio por ID seguro.'
    $eighth=$state.slots[7]
    if($eighth.userId -or $eighth.enabled){throw 'Fuente8 no empieza vacia.'}
    $eighth.userId='888888888888888888';$eighth.enabled=$true;$eighth.avatar='rose-puppet'
    $savedEighth=Invoke-RestMethod "$url/api/slots/8" -Method Put -ContentType 'application/json' -Headers @{'X-VF-Panel'='1'} -Body ($eighth | ConvertTo-Json -Depth 8)
    if($savedEighth.userId -ne $eighth.userId -or (Invoke-WebRequest "$url/overlay/8").StatusCode -ne 200){throw 'Fuente8 no guarda o no sirve overlay.'}
    if((Invoke-WebRequest "$url/api/source-events/8/load" -Method Post -Headers @{'X-VF-Panel'='1'}).StatusCode -ne 204){throw 'Fuente8 no registra eventos.'}
    $eighth.userId=$null;$eighth.enabled=$false
    Invoke-RestMethod "$url/api/slots/8" -Method Put -ContentType 'application/json' -Headers @{'X-VF-Panel'='1'} -Body ($eighth | ConvertTo-Json -Depth 8) | Out-Null
    Write-Output 'PASS: octava fuente vacia, asignable, guardable, overlay/eventos y desactivacion.'
    $seventh=$state.slots[6]
    $seventh.userId='99999999999999999998';$seventh.enabled=$true;$seventh.avatar='frost-puppet'
    $savedSeventh=Invoke-RestMethod "$url/api/slots/7" -Method Put -ContentType 'application/json' -Headers @{'X-VF-Panel'='1'} -Body ($seventh | ConvertTo-Json -Depth 8)
    if($savedSeventh.userId -ne $seventh.userId -or $savedSeventh.avatar -ne 'frost-puppet'){throw 'Fuente7 no guarda.'}
    if((Invoke-WebRequest "$url/overlay/7").StatusCode -ne 200){throw 'Fuente7 no abre.'}
    $event7=Invoke-WebRequest "$url/api/source-events/7/load" -Method Post -Headers @{'X-VF-Panel'='1'}
    if($event7.StatusCode -ne 204){throw 'Fuente7 no registra eventos.'}
    if((Invoke-WebRequest "$url/overlay/9" -SkipHttpErrorCheck).StatusCode -ne 404){throw 'Fuente fuera del limite expuesta.'}
    $invalidSlot=$savedSeventh | ConvertTo-Json -Depth 8 | ConvertFrom-Json
    $invalidSlot.id=9
    if((Invoke-WebRequest "$url/api/slots/9" -Method Put -ContentType 'application/json' -Headers @{'X-VF-Panel'='1'} -Body ($invalidSlot | ConvertTo-Json -Depth 8) -SkipHttpErrorCheck).StatusCode -ne 400){throw 'API acepta fuente fuera del limite.'}
    if((Invoke-WebRequest "$url/api/source-events/9/load" -Method Post -Headers @{'X-VF-Panel'='1'} -SkipHttpErrorCheck).StatusCode -ne 403){throw 'Eventos aceptan fuente fuera del limite.'}

    $seventh.userId=$null;$seventh.enabled=$false
    Invoke-RestMethod "$url/api/slots/7" -Method Put -ContentType 'application/json' -Headers @{'X-VF-Panel'='1'} -Body ($seventh | ConvertTo-Json -Depth 8) | Out-Null
    Write-Output 'PASS: septima fuente guarda, sirve overlay y registra eventos; limites correctos.'
    $slot = $state.slots[0]
    $slot.userId = 'demo-a'; $slot.enabled = $true; $slot.opacity = 0.35
    $saved = Invoke-RestMethod "$url/api/slots/1" -Method Put -ContentType 'application/json' -Headers @{'X-VF-Panel'='1'} -Body ($slot | ConvertTo-Json -Depth 8)
    if ($saved.opacity -ne 0.35) { throw 'Opacidad no guardada.' }
    $state = Invoke-RestMethod "$url/api/state"
    if ($state.slots[0].userId -ne 'demo-a' -or $state.slots[0].opacity -ne 0.35) { throw 'Fuente no comparte ajustes con panel.' }
    $source = Invoke-WebRequest "$url/overlay/1"
    if ($source.StatusCode -ne 200 -or $source.Content -notmatch 'source.js' -or $source.Content -match 'panel.js') { throw 'Fuente individual incorrecta.' }
    $html = Invoke-WebRequest "$url/"
    if ($html.Content -notmatch 'EL ELENCO DEL DIRECTO' -or $html.Content -notmatch 'panel.css') { throw 'GUI no servido.' }
    $blocked = Invoke-WebRequest "$url/api/slots/1" -Method Put -ContentType 'application/json' -Body ($slot | ConvertTo-Json -Depth 8) -SkipHttpErrorCheck
    if ($blocked.StatusCode -ne 403) { throw 'Escritura sin cabecera aceptada.' }
    $blocked = Invoke-WebRequest "$url/api/slots/1" -Method Put -ContentType 'application/json' -Headers @{'X-VF-Panel'='1'; Origin='https://untrusted.example'} -Body ($slot | ConvertTo-Json -Depth 8) -SkipHttpErrorCheck
    if ($blocked.StatusCode -ne 403) { throw 'Origen externo aceptado.' }
    $bad=$slot.PSObject.Copy(); $bad.opacity=2
    $blocked = Invoke-WebRequest "$url/api/slots/1" -Method Put -ContentType 'application/json' -Headers @{'X-VF-Panel'='1'} -Body ($bad | ConvertTo-Json) -SkipHttpErrorCheck
    if ($blocked.StatusCode -ne 400) { throw 'Opacidad fuera de rango aceptada.' }
    $slot.enabled=$false
    Invoke-RestMethod "$url/api/slots/1" -Method Put -ContentType 'application/json' -Headers @{'X-VF-Panel'='1'} -Body ($slot | ConvertTo-Json -Depth 8) | Out-Null
    $state = Invoke-RestMethod "$url/api/state"
    if ($state.slots[0].enabled) { throw 'Fuente sigue activa.' }
    $version=Invoke-RestMethod "$url/api/ui-version"
    $page=Invoke-WebRequest "$url/overlay/1"
    if ($page.Content -match '__UI_VERSION__' -or $page.Content -notmatch ('v='+$version.version)) { throw 'HTML no versionado.' }
    $module=Invoke-WebRequest "$url/avatar-view.js"
    if ($module.Content -match '__UI_VERSION__' -or $module.Content -notmatch ('transitions.js\?v='+$version.version)) { throw 'Importaciones no versionadas.' }
    if ($module.Headers['Cache-Control'] -notmatch 'no-store') { throw 'Cabecera de cache ausente.' }
    $asset=Join-Path $root 'artifacts/win-x64/wwwroot/live-update.js'
    $original=[IO.File]::ReadAllText($asset)
    try {
        [IO.File]::AppendAllText($asset, [Environment]::NewLine+'/* cache invalidation probe */')
        Start-Sleep -Milliseconds 1100
        $changed=Invoke-RestMethod "$url/api/ui-version"
        if ($changed.version -eq $version.version) { throw 'Cambio de recurso no detectado.' }
    } finally { [IO.File]::WriteAllText($asset,$original) }
    [IO.Directory]::CreateDirectory($data) | Out-Null
    $wave=Join-Path $data 'entrada.wav'
    Invoke-WebRequest "$url/media/default-entry.wav" -OutFile $wave
    $bytes=[IO.File]::ReadAllBytes($wave)
    if ([Text.Encoding]::ASCII.GetString($bytes,0,4) -ne 'RIFF' -or $bytes.Length -lt 1000) { throw 'Sonido incluido invalido.' }
    $upload=Invoke-RestMethod "$url/api/sounds" -Method Post -Headers @{'X-VF-Panel'='1'} -Form @{sound=Get-Item -LiteralPath $wave}
    if ($upload.soundId -notmatch '^[a-f0-9]{32}\.wav$') { throw 'Importacion no portable.' }
    $audio=Invoke-WebRequest "$url/media/sounds/$($upload.soundId)" -Headers @{Range='bytes=0-15'}
    if ($audio.StatusCode -ne 206) { throw 'Audio no admite rangos.' }
    $slot.nameStyle='outline';$slot.nameSize=26;$slot.nameOpacity=.6;$slot.entryAnimation='fire';$slot.entrySound=$upload.soundId;$slot.entrySoundFile=$upload.soundId
    Invoke-RestMethod "$url/api/slots/1" -Method Put -ContentType 'application/json' -Headers @{'X-VF-Panel'='1'} -Body ($slot | ConvertTo-Json -Depth 8) | Out-Null
    $state=Invoke-RestMethod "$url/api/state"
    if($state.slots[0].nameStyle -ne 'outline' -or $state.slots[0].entrySound -ne $upload.soundId){throw 'Nuevos ajustes no compartidos.'}
    $badAudio=Join-Path $data 'falso.wav'
    [IO.File]::WriteAllText($badAudio,'This is not a WAV audio file.')
    $rejected=Invoke-WebRequest "$url/api/sounds" -Method Post -Headers @{'X-VF-Panel'='1'} -Form @{sound=Get-Item -LiteralPath $badAudio} -SkipHttpErrorCheck
    if($rejected.StatusCode -ne 400){throw 'Archivo falso aceptado.'}
    $slot.avatar='cyan-puppet';$slot.puppetIdle=.4;$slot.puppetHeadRange=18;$slot.puppetExpression='curious'
    Invoke-RestMethod "$url/api/slots/1" -Method Put -ContentType 'application/json' -Headers @{'X-VF-Panel'='1'} -Body ($slot | ConvertTo-Json -Depth 8) | Out-Null
    $puppetState=Invoke-RestMethod "$url/api/state"
    if($puppetState.slots[0].avatar -ne 'cyan-puppet' -or $puppetState.slots[0].puppetHeadRange -ne 18){throw 'Puppet no persiste.'}
    $slot.avatar='jade-puppet'
    $jadeSaved=Invoke-RestMethod "$url/api/slots/1" -Method Put -ContentType 'application/json' -Headers @{'X-VF-Panel'='1'} -Body ($slot | ConvertTo-Json -Depth 8)
    if($jadeSaved.avatar -ne 'jade-puppet'){throw 'Jade no aceptado.'}
    $jadeRig=Invoke-RestMethod "$url/puppets/jade-dragon/rig.json"
    if($jadeRig.behavior -ne 'serpent' -or $jadeRig.meshSegments -ne 24 -or -not $jadeRig.eyeMask){throw 'Rig Jade incompleto.'}
    foreach($jadeAsset in @($jadeRig.parts | Where-Object src | Select-Object -ExpandProperty src -Unique)){
        $jadeResponse=Invoke-WebRequest "$url/puppets/jade-dragon/$jadeAsset"
        if($jadeResponse.StatusCode -ne 200){throw 'Textura Jade ausente.'}
    }
    $jadePlayer=Invoke-WebRequest "$url/puppet/player.js"
    if($jadePlayer.Content -match '__UI_VERSION__'){throw 'Player no versionado.'}
    Write-Output 'PASS: Jade seleccionado/persistido, manifest serpentino y todas sus capas servidas.'
    $slot.puppetJadeShiny=$true
    $shinySaved=Invoke-RestMethod "$url/api/slots/1" -Method Put -ContentType 'application/json' -Headers @{'X-VF-Panel'='1'} -Body ($slot | ConvertTo-Json -Depth 8)
    if(-not $shinySaved.puppetJadeShiny -or $shinySaved.avatar -ne 'jade-puppet'){throw 'Jade shiny no persiste.'}
    if((Invoke-WebRequest "$url/puppet/jade-palette.js").StatusCode -ne 200){throw 'Paleta shiny ausente.'}
    $slot.puppetJadeShiny=$false
    $normalJade=Invoke-RestMethod "$url/api/slots/1" -Method Put -ContentType 'application/json' -Headers @{'X-VF-Panel'='1'} -Body ($slot | ConvertTo-Json -Depth 8)
    if($normalJade.puppetJadeShiny){throw 'No restaura color original.'}
    Write-Output 'PASS: paleta Jade shiny persistente y reversible sin cambiar avatar.'

    $slot.avatar='amber-puppet'
    $amberSaved=Invoke-RestMethod "$url/api/slots/1" -Method Put -ContentType 'application/json' -Headers @{'X-VF-Panel'='1'} -Body ($slot | ConvertTo-Json -Depth 8)
    $amberRig=Invoke-RestMethod "$url/puppets/amber-dragon/rig.json"
    if($amberSaved.avatar -ne 'amber-puppet' -or $null -eq $amberRig.surfaceMouth -or @($amberRig.parts | Where-Object id -eq 'jaw').Count -gt 0){throw 'Ambar no usa boca superficial.'}
    if(@($amberRig.parts | Where-Object id -like 'brow-*').Count -ne 2){throw 'Ambar no tiene cejas separadas.'}
    foreach($amberAsset in @($amberRig.parts | Where-Object src | Select-Object -ExpandProperty src -Unique)){
        $amberResponse=Invoke-WebRequest "$url/puppets/amber-dragon/$amberAsset"
        if($amberResponse.StatusCode -ne 200){throw 'Textura Ambar ausente.'}
    }
    Write-Output 'PASS: Ambar persistente, cejas, boca sin mandibula y todas las capas servidas.'
    $slot.avatar='cyan-puppet'
    $slot.avatar='thoxer-puppet';$slot.accessoryGlasses='rectangular';$slot.puppetCyberGlow=$true;$slot.puppetCyberGlowIntensity=.42
    $thoxerSaved=Invoke-RestMethod "$url/api/slots/1" -Method Put -ContentType 'application/json' -Headers @{'X-VF-Panel'='1'} -Body ($slot | ConvertTo-Json -Depth 8)
    $thoxerRig=Invoke-RestMethod "$url/puppets/thoxer-dragon/rig.json"
    if($thoxerSaved.avatar -ne 'thoxer-puppet' -or $thoxerSaved.accessoryProfiles.'thoxer-puppet'.accessoryGlasses -ne 'rectangular' -or $thoxerSaved.puppetCyberGlowIntensity -ne .42 -or -not $thoxerRig.cyberGlow){throw 'Thoxer/glow no persistente.'}
    foreach($thoxerAsset in @($thoxerRig.parts | Where-Object src | Select-Object -ExpandProperty src -Unique)){
        $thoxerResponse=Invoke-WebRequest "$url/puppets/thoxer-dragon/$thoxerAsset"
        if($thoxerResponse.StatusCode -ne 200){throw 'Textura Thoxer ausente.'}
    }
    Write-Output 'PASS: Thoxer y todas sus capas, perfil con lentes y brillo cibernetico persistentes.'
    $slot.avatar='ember-puppet';$slot.accessoryGlasses='none'
    $emberSaved=Invoke-RestMethod "$url/api/slots/1" -Method Put -ContentType 'application/json' -Headers @{'X-VF-Panel'='1'} -Body ($slot | ConvertTo-Json -Depth 8)
    $emberRig=Invoke-RestMethod "$url/puppets/ember-dragon/rig.json"
    if($emberSaved.avatar -ne 'ember-puppet' -or $null -eq $emberRig.surfaceMouth -or @($emberRig.parts | Where-Object id -eq 'jaw').Count -gt 0){throw 'Ascua no persiste o boca incorrecta.'}
    foreach($asset in @($emberRig.parts | Where-Object src | Select-Object -ExpandProperty src -Unique)){
        if((Invoke-WebRequest "$url/puppets/ember-dragon/$asset").StatusCode -ne 200){throw 'Textura Ascua ausente.'}
    }
    Write-Output 'PASS: Ascua persistente y todas las piezas servidas; boca sin jaw.'
    $slot.avatar='patch-puppet'
    $patchSaved=Invoke-RestMethod "$url/api/slots/1" -Method Put -ContentType 'application/json' -Headers @{'X-VF-Panel'='1'} -Body ($slot | ConvertTo-Json -Depth 8)
    $patchRig=Invoke-RestMethod "$url/puppets/patch-dragon/rig.json"
    if($patchSaved.avatar -ne 'patch-puppet' -or $patchRig.surfaceSmile -ne 30 -or @($patchRig.parts | Where-Object id -eq 'bandana').Count -ne 1){throw 'Remiendo/bandana no disponibles.'}
    foreach($asset in @($patchRig.parts | Where-Object src | Select-Object -ExpandProperty src -Unique)){
        if((Invoke-WebRequest "$url/puppets/patch-dragon/$asset").StatusCode -ne 200){throw 'Textura Remiendo ausente.'}
    }
    Write-Output 'PASS: Remiendo persistente, sonrisa y mascada azul independientes, todas sus capas servidas.'
    $slot.avatar='rose-puppet'
    $roseSaved=Invoke-RestMethod "$url/api/slots/1" -Method Put -ContentType 'application/json' -Headers @{'X-VF-Panel'='1'} -Body ($slot | ConvertTo-Json -Depth 8)
    $roseRig=Invoke-RestMethod "$url/puppets/rose-dragon/rig.json"
    if($roseSaved.avatar -ne 'rose-puppet' -or $roseRig.surfaceSlant -ne -22 -or @($roseRig.parts | Where-Object sparkles).Count -ne 2){throw 'Rosalia/sonrisa/destellos ausentes.'}
    foreach($asset in @($roseRig.parts | Where-Object src | Select-Object -ExpandProperty src -Unique)){
        if((Invoke-WebRequest "$url/puppets/rose-dragon/$asset").StatusCode -ne 200){throw 'Textura Rosalia ausente.'}
    }
    if((Invoke-WebRequest "$url/puppet/sparkles.js").StatusCode -ne 200){throw 'Modulo de destellos ausente.'}
    Write-Output 'PASS: Rosalia persistente, antenas y todas las texturas servidas, sonrisa y destellos.'
    $slot.avatar='frost-puppet'
    $frostSaved=Invoke-RestMethod "$url/api/slots/1" -Method Put -ContentType 'application/json' -Headers @{'X-VF-Panel'='1'} -Body ($slot | ConvertTo-Json -Depth 8)
    $frostRig=Invoke-RestMethod "$url/puppets/frost-dragon/rig.json"
    if($frostSaved.avatar -ne 'frost-puppet' -or $frostRig.surfaceSlant -ne -60 -or $null -eq $frostRig.surfaceMouth -or @($frostRig.parts | Where-Object id -eq 'jaw').Count -ne 0){throw 'Boreal/sonrisa no disponibles.'}
    foreach($asset in @($frostRig.parts | Where-Object src | Select-Object -ExpandProperty src -Unique)){
        if((Invoke-WebRequest "$url/puppets/frost-dragon/$asset").StatusCode -ne 200){throw 'Textura Boreal ausente.'}
    }
    Write-Output 'PASS: Boreal persistente y todas sus capas servidas; sonrisa sin jaw.'

    $slot.userId='99999999999999999999';$slot.enabled=$true
    $absentSaved=Invoke-RestMethod "$url/api/slots/1" -Method Put -ContentType 'application/json' -Headers @{'X-VF-Panel'='1'} -Body ($slot | ConvertTo-Json -Depth 8)
    $absentState=Invoke-RestMethod "$url/api/state"
    if($absentSaved.userId -ne '99999999999999999999' -or -not $absentSaved.enabled -or @($absentState.participants | Where-Object userId -eq '99999999999999999999').Count -ne 0){throw 'Preasignacion ausente no conservada.'}
    if((Invoke-WebRequest "$url/guest-assignment.js").StatusCode -ne 200){throw 'Control de preasignacion ausente.'}
    $slot.userId='demo-a'
    Write-Output 'PASS: usuario aun ausente asignado y habilitado sin inventar presencia en canal.'




    $slot.avatar='cyan-puppet';$slot.accessoryGlasses='none'
    $slot.puppetParts = @{ jaw = @{ x = 18; y = -8; scaleX = 1.05; scaleY = .9; rotation = 2 } }
    $slot.puppetMouthTravel = 65; $slot.puppetPadding = 300; $slot.puppetMouthMode = 'fixed'; $slot.puppetMouthMaxDb = -25; $slot.puppetMouthStability = .7
    $edited = Invoke-RestMethod "$url/api/slots/1" -Method Put -ContentType 'application/json' -Headers @{'X-VF-Panel'='1'} -Body ($slot | ConvertTo-Json -Depth 8)
    if($edited.puppetParts.jaw.y -ne -8 -or $edited.puppetMouthTravel -ne 65 -or $edited.puppetPadding -ne 300 -or $edited.puppetMouthMode -ne 'fixed' -or $edited.puppetMouthMaxDb -ne -25 -or $edited.puppetMouthStability -ne .7){throw 'Editor no guarda sus cambios.'}
    $editor = Invoke-WebRequest "$url/puppet/editor.js"
    if($editor.Content -notmatch 'Boca y encuadre' -or $editor.Content -notmatch 'Apertura máxima'){throw 'Editor ausente.'}
    Write-Output 'PASS: editor HTTP por pieza, apertura y margen compartidos/persistentes.'
    foreach($effect in @('summon','tempest','celestial')){
        $slot.entryAnimation=$effect;$slot.exitAnimation=$effect;$slot.transitionSpeed=1.2;$slot.transitionIntensity=.7;$slot.transitionQuality='high'
        $savedEffect=Invoke-RestMethod "$url/api/slots/1" -Method Put -ContentType 'application/json' -Headers @{'X-VF-Panel'='1'} -Body ($slot | ConvertTo-Json -Depth 8)
        if($savedEffect.entryAnimation -ne $effect -or $savedEffect.exitAnimation -ne $effect -or $savedEffect.transitionQuality -ne 'high'){throw 'No persisten efectos nuevos.'}
    }
    $slot.accessoryGlasses='round';$slot.accessoryHat='wizard';$slot.accessoryNecklace='gem'
    $accessoriesSaved=Invoke-RestMethod "$url/api/slots/1" -Method Put -ContentType 'application/json' -Headers @{'X-VF-Panel'='1'} -Body ($slot | ConvertTo-Json -Depth 8)
    $accessoriesState=Invoke-RestMethod "$url/api/state"
    if($accessoriesSaved.accessoryGlasses -ne 'round' -or $accessoriesState.slots[0].accessoryHat -ne 'wizard' -or $accessoriesState.slots[0].accessoryNecklace -ne 'gem'){throw 'Accesorios no compartidos.'}
    $accessoriesModule=Invoke-WebRequest "$url/puppet/accessories.js"
    if($accessoriesModule.Content -match '__UI_VERSION__' -or $accessoriesModule.Content -notmatch 'accessoryControls'){throw 'Modulo de accesorios ausente.'}
    $catalog=Invoke-RestMethod "$url/accessories/catalog.json"
    if(@($catalog).Count -ne 20){throw 'Catalogo incompleto.'}
    foreach($item in $catalog){$assetResponse=Invoke-WebRequest "$url/accessories/$($item.file)";if($assetResponse.StatusCode -ne 200){throw 'Accesorio no servido.'}}
    $slot.accessoryAura='energy';$slot.accessoryFloor='smoke';$slot.accessoryLightning='storm';$slot.accessoryEffect='nose-smoke'
    $slot.accessoryObject='phone';$slot.accessoryObjectLeft='galaxy';$slot.accessoryHat='crown'
    $slot.accessoryEdits=@{'cyan-dragon:effect-nose'=@{x=15;y=-25;scale=.8;rotation=5;color='#aabbcc';intensity=.7;speed=1.2;interval=34;spread=.25}}
    $vfxSaved=Invoke-RestMethod "$url/api/slots/1" -Method Put -ContentType 'application/json' -Headers @{'X-VF-Panel'='1'} -Body ($slot | ConvertTo-Json -Depth 8)
    if($vfxSaved.accessoryFloor -ne 'smoke' -or $vfxSaved.accessoryProfiles.'cyan-puppet'.accessoryAura -ne 'energy' -or $vfxSaved.accessoryEdits.'cyan-dragon:effect-nose'.interval -ne 34){throw 'Efectos no compartidos por API.'}
    $shaderModule=Invoke-WebRequest "$url/puppet/prop-effects.js"
    if($shaderModule.Content -notmatch 'propShader' -or $shaderModule.Content -match '__UI_VERSION__'){throw 'VFX no disponible.'}
    Write-Output 'PASS: auras, humo, rayos, objetos animados y color/intervalo/posicion por Puppet compartidos por API.'
    $slot.accessoryObjectLeft='microphone';$slot.objectLeftAnimation='none';$slot.objectLeftSpeed=2;
    $slot.accessoryObject='microphone';$slot.accessoryEdits=@{'cyan-dragon:object-microphone'=@{x=-100;y=30;scale=1.2;rotation=-15}};$slot.objectAnimation='sway';$slot.objectAmplitude=.6;$slot.objectSpeed=1.2
    Invoke-RestMethod "$url/api/slots/1" -Method Put -ContentType 'application/json' -Headers @{'X-VF-Panel'='1'} -Body ($slot | ConvertTo-Json -Depth 8) | Out-Null
    $objectState=Invoke-RestMethod "$url/api/state"
    if($objectState.slots[0].accessoryObjectLeft -ne 'microphone' -or $objectState.slots[0].objectLeftAnimation -ne 'none' -or $objectState.slots[0].objectLeftSpeed -ne 2 -or $objectState.slots[0].accessoryObject -ne 'microphone' -or $objectState.slots[0].accessoryEdits.'cyan-dragon:object-microphone'.x -ne -100 -or $objectState.slots[0].objectAnimation -ne 'sway'){throw 'Editor/objeto no comparte ajustes.'}
    Invoke-WebRequest "$url/api/source-events/1/entry" -Method Post -Headers @{'X-VF-Panel'='1'} | Out-Null
    $invalidEvent=Invoke-WebRequest "$url/api/source-events/1/arbitrary" -Method Post -Headers @{'X-VF-Panel'='1'} -SkipHttpErrorCheck
    if($invalidEvent.StatusCode -ne 400){throw 'Evento arbitrario aceptado.'}
    $trace=Join-Path $data 'logs/discord-diagnostics.jsonl'
    if((Get-Content -LiteralPath $trace -Raw) -notmatch 'SOURCE_1_ENTRY'){throw 'Animacion no registrada.'}
    $slot.avatar='amber-puppet';$slot.accessoryGlasses='round'
    $slot.accessoryProfiles=@{'cyan-puppet'=@{accessoryGlasses='sun';accessoryHat='top';objectSpeed=2};'amber-puppet'=@{accessoryGlasses='round'}}
    $slot.accessoryEdits=@{'cyan-dragon:glasses-sun'=@{x=50;y=20;scale=.8;rotation=0};'amber-dragon:glasses-round'=@{x=-30;y=-60;scale=1.2;rotation=0}}
    Invoke-RestMethod "$url/api/slots/1" -Method Put -ContentType 'application/json' -Headers @{'X-VF-Panel'='1'} -Body ($slot | ConvertTo-Json -Depth 8) | Out-Null
    $profiles=Invoke-RestMethod "$url/api/state"
    if($profiles.slots[0].accessoryProfiles.'cyan-puppet'.accessoryHat -ne 'top' -or $profiles.slots[0].accessoryProfiles.'amber-puppet'.accessoryGlasses -ne 'round' -or $profiles.slots[0].accessoryEdits.'cyan-dragon:glasses-sun'.x -ne 50){throw 'Perfiles mezclados.'}
    $profileModule=Invoke-WebRequest "$url/puppet/accessory-profiles.js"
    if($profileModule.Content -match '__UI_VERSION__'){throw 'Perfiles sin versionar.'}
    Write-Output 'PASS: perfiles independientes por Puppet y posiciones por modelo compartidos via API.'
    Write-Output 'PASS: catalogo/archivos, editor/objeto persistentes por API y logs sanitizados de fuente.' 
    $slot.puppetEyeGlow=$true;$slot.puppetEyeGlowIntensity=.4;$slot.puppetPatternGlow=$true;$slot.puppetPatternGlowIntensity=.3
    $slot.ambientEffects=@('runes','orbs','embers');$slot.ambientColor='#ffaa66';$slot.ambientIntensity=.7;$slot.ambientQuality='high'
    $ambientSaved=Invoke-RestMethod "$url/api/slots/1" -Method Put -ContentType 'application/json' -Headers @{'X-VF-Panel'='1'} -Body ($slot | ConvertTo-Json -Depth 8)
    if(@($ambientSaved.ambientEffects).Count -ne 3 -or $ambientSaved.ambientColor -ne '#ffaa66' -or -not $ambientSaved.puppetEyeGlow -or $ambientSaved.puppetPatternGlowIntensity -ne .3){throw 'Adornos no persisten.'}
    $ambient=Invoke-WebRequest "$url/vfx/ambient.js"
    if($ambient.Content -notmatch 'AmbientLayer'){throw 'Modulo de adornos ausente.'}
    $history=Join-Path $data 'logs/discord-diagnostics.jsonl'
    if(-not (Test-Path -LiteralPath $history) -or (Get-Content -LiteralPath $history -Raw) -notmatch 'APP_START_DEMO'){throw 'Log persistente no creado.'}
    Write-Output 'PASS: adornos combinables/persistentes y log local creado fuera de wwwroot.'
    $cinematic=Invoke-WebRequest "$url/vfx/cinematic.js"
    if($cinematic.Content -notmatch 'runCinematic' -or $cinematic.Content -match '__UI_VERSION__'){throw 'Escenas no disponibles.'}
    Write-Output 'PASS: tres secuencias de entrada/salida, calidad/intensidad/velocidad persistentes y modulo servido.'
    $rig=Invoke-RestMethod "$url/puppets/cyan-dragon/rig.json"
    if(@($rig.parts).Count -ne 18){throw 'Faltan piezas del Puppet.'}
    foreach($part in $rig.parts){if($part.kind -eq 'solid'){continue};$image=Invoke-WebRequest ("$url/puppets/cyan-dragon/"+$part.src);if($image.StatusCode -ne 200 -or $image.Headers['Content-Type'] -notmatch 'image/png'){throw 'Textura ausente.'}}
    $player=Invoke-WebRequest "$url/puppet/player.js"
    if($player.Content -match '__UI_VERSION__' -or $player.Content -notmatch 'rig.json'){throw 'Player no versionado.'}
    Write-Output 'PASS: Puppet selectable/persistente, 14 PNG y fondos y cavidad recortada y modulos/manifest servidos.'
    Write-Output 'PASS: HTML/modulos versionados, no-store, deteccion de cambios, WAV original, importacion/rangos de audio, estilos y rechazo de audio falso.'
    $state | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $root 'artifacts/gui-smoke-state.json') -Encoding utf8
    Write-Output 'PASS: GUI HTTP, ocho fuentes, asignacion, opacidad compartida, desactivacion, validacion y rechazo de escrituras externas.'
} finally {
    if (-not $process.HasExited) { Stop-Process -Id $process.Id }
}
