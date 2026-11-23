# Vtuber&Friends
- Lee README.md, PUBLIC_STATUS.md y CURRENT.md si existe antes de continuar.
- Solo el streamer instala y ejecuta la aplicación. Amigos usan Discord normal.
- .NET 10 LTS. Rutas relativas al ejecutable o a PSScriptRoot. No introducir rutas del equipo.
- Prototipo 1: bot oficial de Discord, DAVE obligatorio, PCM por usuario y overlay local para Streamlabs.
- No considerar eventos Speaking como prueba de recepción de audio.
- No guardar audio ni tokens en texto plano. Por peticion del usuario, scripts/run.ps1 guarda el token cifrado con DPAPI en .local/bot-token.dpapi ; el ejecutable también lo lee/escribe directamente mediante TokenVault DPAPI compatible con PowerShell, y conserva VF_DISCORD_BOT_TOKEN como fallback. Excluir credenciales de Git y publish; no copiar a otro usuario/equipo.
- No declarar PASS de DAVE sin llamada real con al menos dos usuarios, habla simultánea y reentrada.
- Distinguir tests sintéticos, carga de nativas y validación real Discord/Streamlabs.

## Panel y fuentes
- El usuario autorizo crear el GUI aunque la prueba DAVE multiusuario siga pendiente. No declarar PASS completo por el GUI.
- Fuentes públicas locales /overlay/ID con IDs estables, solo avatar y nombre, transparentes. Instalación nueva0 fuentes; alta explícita hasta64. Nunca reutilizar IDs eliminados ni renumerar las demás. No mostrar participantes automáticamente.
- Respetar asignacion + Enabled + presencia en canal + receptor conectado. Preview del panel puede mostrar una fuente desactivada.
- Ajustes compartidos por servidor en .local/avatars.json; no depender de localStorage para fuentes de Streamlabs.
- Nombre desde nickname/global name/username de Discord; no interpolar nombres en HTML.
- No abrir ventanas ni iniciar Discord durante tests. Smoke usa demo aislada en 17862 y datos temporales.
## Actualizaciones y efectos
- Mantener __UI_VERSION__ en las importaciones de modulos y enlaces CSS/JS. UiAssets inyecta el hash al servirlos; live-update compara versiones estables. No depender solo de no-store.
- Primera instalación del actualizador exige una ultima recarga de fuentes antiguas; no prometer retroactividad a documentos que no lo incluyen.
- Animaciones en transitions.js via registro, entrada/salida independientes. No ocultar antes de acabar salida; cancelar correctamente en reentrada. Preview no debe duplicar eventos automáticos del directo.
- Sonidos elegidos por usuario se copian a .local/sounds. Nunca abrir rutas arbitrarias recibidas de HTTP ni servir toda .local (contiene token).
- No afirmar prueba visual o reproducción en Streamlabs por validar WAV/HTTP. No eludir politicas de autoplay.
## Presencia en el canal
- Usar SocketVoiceChannel.ConnectedUsers, nunca Users heredado del canal de texto. Users incluye usuarios con acceso aunque hayan salido y rompe pop in/out.
- No equiparar contador de avisos acumulados con incidencia activa. Presentar causa y ventana reciente; no ocultar advertencias DAVE ni descifrado.
## Puppet 2D
- Conservar rig por capas y referencia original. Documentar reconstruccion generativa sin afirmar extraccion exacta.
- Ojos detras de huecos transparentes; fondos oscuros y parpados independientes. No aplastar ojos blancos para simular pestañeo.
- Cabeza sin boca fija: boca, mandibula y colmillos se animan separados. Preservar audio/presencia/efectos y ajustes del usuario.

- Revision boca 4 autorizada: cabeza SIN dientes; exactamente DOS colmillos en capa independiente, parent head y deformacion del labio superior compartida. Cavidad negra y lengua recortadas entre bordes; conservar partes separadas.

- Editor Puppet: guardar transformaciones por fuente en PuppetParts, IDs y rangos validados; no cambiar PNG originales. Prueba de boca/pausa solo local y nunca persistida ni propagada al directo. Mantener viewBox con margen interno para animaciones.

- Escenas cinematograficas summon/tempest/celestial en vfx/cinematic.js, via registro de transiciones. Mantener cancelacion y cleanup front/back, limites de particulas y revelado del Puppet real. Durante salida, materializing permite render aunque active=false; limpiar ese estado al finalizar/cancelar. No seleccionar efectos ni activar VFX constantes sin solicitud.

- Adornos persistentes en vfx/ambient.js: default ninguno activo, anchors del rig real, capas separadas, liberar RAF/canvas al desactivar y suspender durante transiciones. No activar fuego por grito hasta su iteracion solicitada.
- DiagnosticLog solo categorias sanitizadas y cantidades, rotacion4archivos y limite2MB; nunca pasar log.Message ni payloads al fichero. Historial no equivale a fallo activo. No prometer recuperacion retroactiva de avisos anteriores al log.

- Panel rendimiento es local: detener y liberar previews, sin guardar Enabled=false ni afectar fuentes. Edicion por coordenadas oculta; preservar PuppetParts. Mantener dB en casilla fija.
- Arcos persistentes retirados; filtrar arcs en migracion y preservar otros adornos. Autoencuadre incluye glows y orbita completa dentro400x300.
- Glow ojos/patron separado, solo pixeles emisivos; no aplicar brillo global. Respetar parpadeo, orden de capas y cero pasadas extra al apagar.

-400x300 es layout lógico, no límite de salida. Resolución HD de fuente1440x1080; asignar píxeles con raster.js y caps de calidad. No atar pixels deFX a devicePixelRatio ignorando viewport.
- Framing CPU y shader deben mantener las mismas deformaciones. Actualizar ambos al cambiar mallas; anchors usan rig.viewBox. Evitar bombeo de cámara en reposo.

- Ámbar: por instrucción del usuario conserva cabeza/hocico completos sin boca pintada. Usa surfaceMouth/surfaceTongue delante de cabeza, cero jaw, dos colmillos independientes siguiendo labio y cejas doradas en nodos propios. No convertir su cara redonda al rig de mandíbula de Cian/Jade. Mantener fórmula CPU/GPU de surface-mouth.js sincronizada.

- Thoxer: conservar referencia aprobada en nexo-cyber-v2; sin lentes incorporados (accesorio rectangular). Mantener ojos estrechos, cejas izquierda/derecha diferentes y boca de superficie sin jaw. Glow cibernético solo verde en6capas, no brillo global, pulso4.8s y cero pasadas al apagar. Perfiles admiten12avatares incluidos8Puppets.

- Rosalía revisión2: copete/flequillo integrados en cabeza, sin pieza flotante. Mantener orden cabeza con cabello > fondos/iris/párpados > pestañas; ojos sobre cabello por petición expresa. Mantener ojos entrecerrados, melena abundante con raíces superpuestas y cuello corto. Antenas y mechones parent head separados. SurfaceSlant CPU/GPU sincronizado, default0 para anteriores. Destellos wing-local con misma rect/deformación/nodo que ala, dentro de alpha y reloj compartido sin RAF adicional.

- Rosalía pestañas v3: una textura lashes-upper compartida, flipX en derecho, sin contorno inferior. Conservar ajuste lashOffsets CPU/GPU sincronizado y lashMask inverso para excluir tinta del hueco. Colmillos activos fang-white blancos neutros; no volver a rosa. PNG originales intactos.

- Boreal: conservar cuerno grande a izquierda de imagen y pequeño a derecha; no simetrizar ni intercambiar. Cejas distintas y aperturas desiguales, iris de igual diámetro (izquierdo más oculto). Cabello integrado en cabeza; sonrisa surfaceSlant=-60 sin jaw y dos colmillos blancos. No activar accesorios ni nuevos VFX sin solicitud.

- Jade shiny: PuppetJadeShiny es una paleta por fuente del mismo jade-puppet, defaultfalse. Mantener PNG/rig/geometría exactos (fixture SHA), recolorear solo verde de texturasJade, excluir accesorios ypasadasglow. Preservar dorado/rojo/iris/alpha. No regenerar piezas para cambiar esta paleta.

- Fuentes dinámicas desde0.7: AvatarStore nuevo vacío; legacy6/7/8 se carga sin añadir, truncar ni reescribir al arrancar. Altas/bajas solo explícitas; IDmonótono en avatars.json.next-id, marcador avatars.json.dynamic y backup local antes de eliminar. Save no puede recrear una fuente borrada. Probar arrays con huecos y URLs de fuentes eliminadas transparentes.

- Auras/humo/rayos y objetos animados: catálogo SVG + prop-effects.js en el renderer Puppet, reloj compartido y alpha premultiplicado. Efectos traseros antes de alas; humo nasal parent head al frente. Reservar rect completo en framing incluso entre emisiones; controles/transformaciones por rigId:accessoryId. No agregar RAF independientes.
- Perfiles por Puppet también conservan adornos, encuadre/piezas, glows y movimiento; deep clone de defaults/objetos anidados al cambiar de modelo. No compartir posiciones entre modelos. No hornear defaults personales hasta que el usuario termine de ajustarlos.
- Sonidos: biblioteca portable Sonidos junto al config; demo usa data-dir/Sonidos. Listado GET /api/sounds al abrir el panel o pulsar Actualizar biblioteca, sin temporizador; IDs hash de nombre, extensiones/contenido/tamaño validados y sin enlaces ni rutas arbitrarias. Mantener importaciones previas en .local/sounds. Publish copia solo LEEME, nunca biblioteca personal ni credenciales.

- Configuración GUI: ConnectionManager serializa cambios y conexiones; nunca devolver token ni excepciones crudas de Discord en HTTP. TokenVault compatible con DPAPI CurrentUser/UTF16/hex de PowerShell. Los tests solo usan secretos sintéticos y datos temporales; no iniciar bots reales ni abrir ventanas.
- Distribución: scripts/make-distribution.py copia una lista permitida a una carpeta NUEVA en Distribucion; nunca borrar fuentes/artefactos previos. Excluir config personal, .local, credenciales, PDB, scripts y notas de generación; conservar todas las dependencias runtime y PNG referenciadas por cada rig. No incluir defaults personales hasta que el usuario termine de ajustarlos.
- WebSocket /api/live: una captura30Hz y bytes compartidos; slots por Revision y diagnóstico1Hz; canal por cliente capacidad1 DropOldest. Limitar origen/Host, cerrar al apagar app, reconectar y restaurar presencia sin repetir entrada. No recuperar polling de /api/state ni versión cada fotograma.
- Autoencuadre: cache por poseRevision; extremos de columnas cuadráticas con endpoints/medio, muestreo completo si usesSerpent. Validar TODOS los vértices y glows de8Puppets tras cambiar. Cargar SVG/texturas de accesorios bajo demanda; no subir texturas de los accesorios desactivados.

- Parches: generar deltas solo entre distribuciones limpias con IDs únicos y hashes before/after. Aplicador no debe modificar config.json, .local, Sonidos ni datos personales; preservar backups y verificar versión/archivos antes de escribir. Mantener guardia de app abierta y rollback probado por fallo intermedio. Declarar --animation para IDs nuevos: restaurar código viejo exige quitar esos valores de ajustes antes, sin sobrescribir ajustes del usuario.

- Antes de crear/entregar cualquier parche, leer docs/PATCH_WORKFLOW.md y ejecutar la prueba de conservación de siete fuentes. Baselines desde ZIP limpio inmutable, nunca instalaciones ya configuradas. Es una exigencia explícita del usuario: no cambiar configuraciones, fuentes ni posiciones; solo agregar la función solicitada.

- Modo prueba de fuentes: estado efímero del servidor testMode, defaultfalse y reset al reiniciar; jamás persistir en config/avatars ni falsear participantes/niveles reales. Solo simular presencia de asignado+Enabled, RMS0, cambios de modo instantáneos y sin audio; no persistir presencia falsa en sessionStorage. Respetar opacidad/encuadre y todas las URLs existentes. Al desactivar usar presencia real. Ver tests/source-display-probe.mjs y tests/test-mode-probe.mjs.

- Compatibilidad legacy: conservar todas las fuentes6/7/8 existentes y sus perfiles completos. Restaurador no puede volver a fuentes fijas tras usar altas/bajas dinámicas; previousDynamicSources permite restaurar entre versiones que sí las admiten. No truncar ni renumerar.

- Desde cierre04: la X del último panel cierra el receptor, con2sde gracia para recarga. panel-lifetime.js se carga independiente de panel.js/state-stream y mantiene lease WebSocket /api/panel-lifetime aunque document.hidden; nunca cerrar esa lease por minimizar/modo rendimiento. Streamlabs/overlays no abren leases. No matar Edge ni procesos ajenos. Headless sin panel sigue funcionando. Validar tests/panel-lifetime-client-probe.mjs y tests/panel-lifetime-probe.mjs.
- Limpieza Discord acotada solo al apagar el host (ConnectionManager.BeginShutdown + ShutdownTasks). No cambiar semántica de reconexión normal ni ocultar fallos DAVE. Pruebas sin credenciales reales ni ventanas de navegador.

- Audio05: reconciliar GetStreams al reconectar y cada5s; lectores acotados por usuario, cancelar reemplazos, suprimir PCM obsoleto. No reconectar por silencio/Speaking. RecoveryBudget3/10min,60s entre intentos; fatal MLS conserva vigilancia y bloquea reintentos aun durante cooldown. Nunca abrir cliente nuevo si limpieza previa quedó incompleta. Pruebas con IAudioReceiver sintético; no usar credenciales ni afirmar estabilidad real por reloj virtual. Reconectar audio no guarda ajustes. Ver tests/RecoveryProbe.

- Desde0.6.0: distribución nueva con lanzador nativo en raíz y runtime en app; config/.local/Sonidos permanecen en raíz. No mover datos de instalaciones antiguas al actualizar. UpdateService solo Releases públicas del repositorio fijo; verificar digest GitHub, ZIP/rutas y helper instalado. Helper --package-root solo bajo .updates/staged, --wait-pid antes de escribir. No ejecutar helpers descargados. Cero actualización forzada durante el directo. Ver docs/UPDATES.md.
- UI: Configurar/Personalizar y subpestañas claras; ocultar opciones de etiqueta si ShowName=false. Editor por clic/gizmos; mantener Aplicar/Cancelar, reposo y edits por Puppet. Tamaño porcentual1..100 representa escala .03..3; no reescribir posiciones existentes. Defaults geométricos solo si no hay edit explícito. Base plana es recorte shader del torso, PNG originales intactos y Jade serpentino excluido.

- Codificación UTF-8 explícita en herramientas. Nunca leer archivos JS/HTML/CS como ANSI para reescribirlos. Auditar mojibake y U+FFFD. Inglés/español se limita a la GUI; no traducir apodos, nombres de usuario ni datos de Discord.
- DEV predeterminado usa .local/dev/config.json y .local/dev/data, sin leer/borrar configuraciones ni tokens de producción. -UseExistingData es elección explícita para abrir datos anteriores. Pruebas usan -DataDirectory temporal y nunca una instalación personal.
- Editor accesorios: catálogo por categorías con +Agregar, selección opcional, campos contextuales y botones Aplicar/Cancelar/X/backdrop. No resaltar partes del cuerpo cuando selected=null. Aplicar conserva perfiles/edits de otros Puppets; cerrar descarta borrador y libera Player/ResizeObserver.
