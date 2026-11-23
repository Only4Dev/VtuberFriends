# Vtuber & Friends

**0.6.0 · Windows x64 · portable**

[Descargar desde Releases](https://github.com/Only4Dev/VtuberFriends/releases/latest). Extrae todo el ZIP y abre **VtuberFriends.exe**. La carpeta `app` contiene las dependencias; no necesitas instalar .NET. Los amigos solo usan Discord.

En Configuración puedes conectar el bot y buscar actualizaciones. Tus configuraciones, fuentes, posiciones y sonidos se conservan. Los parches requieren una versión compatible y no se instalan durante el directo sin que pulses «Instalar y reiniciar». Ver [UPDATES.md](UPDATES.md).

El panel abre maximizado. Cada tarjeta tiene **Configurar** y **Personalizar**; dentro están identidad, movimiento, entradas/salidas, efectos especiales y accesorios. El editor permite seleccionar objetos con clic, arrastrar, cambiar tamaño con las esquinas y girar con el tirador verde. Los cuatro modelos originales se mantienen en **Legacy**.

Los datos se guardan junto al ejecutable principal. Nunca publiques `config.json`, `.local` ni sonidos personales. El historial local de desarrollo no forma parte del repositorio público; consulta [PUBLIC_STATUS.md](PUBLIC_STATUS.md).


Panel local para asignar usuarios de Discord a avatares y mostrarlos como fuentes individuales en Streamlabs. Solo el streamer ejecuta la aplicación; los invitados usan Discord habitual.

## Abrir el programa
Para pasar la app a otra persona usa la carpeta **Distribucion/VtuberFriends**, creada con `scripts/publish.ps1`. Copia la carpeta completa y abre **VtuberFriends.exe**: contiene el runtime .NET y las DLL nativas; no necesita instalar el SDK ni ejecutar PowerShell.

El ejecutable abre el panel con Edge en modo aplicación (o el navegador predeterminado). En **Configuración** introduce el token del bot, el ID del servidor y el ID del canal de voz; pulsa **Guardar y conectar**. El bot debe estar creado e invitado al servidor. El token se cifra con DPAPI para el usuario Windows, nunca se devuelve en HTTP y no se incluye en la distribución.

**Desconectar bot** permite detener la conexión y **Cerrar aplicación** termina el receptor. Desde el parche cierre04, la X de la última ventana principal cierra también el receptor tras unos2segundos; minimizarla mantiene las fuentes funcionando. Una recarga breve no cierra la app. Los datos se guardan en config.json y .local junto al ejecutable, con rutas portables. Usa una carpeta donde tengas permiso de escritura.

Para desarrollo siguen disponibles `scripts/run.ps1`, `-Demo`, `-Doctor` y `-NoPanel`. Conservan el token cifrado compatible con PowerShell y tu configuración del repositorio. La carpeta distribuible empieza sin token, IDs personales, asignaciones, logs ni sonidos privados; tus posiciones personales se convertirán en defaults solo cuando termines de prepararlas.

## Preparar las fuentes
Hay ocho tarjetas, inicialmente sin asignar y desactivadas:
1. Selecciona un invitado del canal. La lista incluye a quienes están conectados aunque no hayan hablado.
2. Elige un avatar: dragón Bronce, Marfil, Musgo o Pizarra.
3. Ajusta la **opacidad**: 100% visible, 0% transparente. El deslizador afecta al avatar y su nombre.
4. Activa **Mostrar**.
5. Pulsa **Copiar fuente** y pega la URL en una Fuente de navegador de Streamlabs. Tamaño recomendado para HD: **1440 × 1080**; **800 × 600** si prefieres menor consumo.

Cada fuente tiene una URL corta y estable: `/overlay/1` hasta `/overlay/8`. No cambia al asignar otro invitado. Solo muestra avatar y nombre, con fondo transparente y sin controles ni diagnóstico. Si el invitado sale del canal, se oculta hasta que regrese. No aparece nadie sin asignación y visibilidad activada. El nombre se toma del apodo del servidor o nombre visible de Discord, y se actualiza al consultar el estado.

Los ajustes se guardan automáticamente en `.local/avatars.json`, junto a la ubicación de config.json. La opacidad y demás cambios llegan a Streamlabs en directo, sin recopiado de URL. Las tarjetas muestran una vista previa incluso si la fuente está desactivada; el estado de cada tarjeta aclara si está habilitada o fuera del canal.

En **Sensibilidad y apariencia** puedes modificar el umbral de voz (-80..-20 dB, inicial -60), cierre de boca (0..750 ms, inicial 200), tamaño (50..140%) y mostrar/ocultar nombre. Un umbral más negativo activa con menos volumen. La animación responde a PCM real; no pretende copiar exactamente el aro verde de Discord. No hay todavía importación de imágenes personales.

Las URL anteriores con `?user=ID` se redirigen a la fuente asignada a ese usuario. Si no existe asignación, permanecen transparentes. El panel de control está en la raíz sin parámetros. Para escenas nuevas, utiliza siempre Copiar fuente.

## Configuración y portabilidad
- .NET 10 LTS. `global.json` permite SDK estable de la familia 10.
- `scripts/setup-dotnet.ps1` usa SDK instalado o instala localmente en .tools/dotnet.
- `scripts/setup-native.ps1` descarga DLL Windows x64 al proyecto y registra fuente/SHA256.
- `config.json` contiene guildId, channelId y port; no contiene credenciales. Ver BOT_SETUP.md.
- `scripts/publish.ps1` produce artifacts/win-x64 con runtime .NET, scripts, accesos y recursos incluidos. Copiar la carpeta completa. Configurar config.json junto al ejecutable y usar su acceso de inicio.
- No se copian credenciales ni asignaciones al publicar. En otro equipo/usuario Windows hay que introducir el token una vez.
- Rutas relativas al ejecutable, config.json o PSScriptRoot; sin dependencias de la ubicación del proyecto.

## Discord y límites conocidos
Discord.Net.WebSocket **3.20.2-nightly.20261111.899** (resolución exacta y packages.lock.json) con DAVE obligatorio y libdave **1.2.1**. La nightly incluye PR #3288. libdave 1.3 cambia la ABI de propuestas/welcome y es incompatible con estos bindings: el doctor detecta su export nuevo y la rechaza antes de negociar. DLL se copian Always para evitar que una versión incompatible con fecha más reciente sobreviva a un cambio de versión.

El bot se conecta fuera de callbacks del gateway, sin auto-deaf y con auto-mute. Cada AudioInStream entrega PCM16 descifrado/decodificado por usuario. No se guarda ni retransmite audio. Se exponen niveles, IDs, nombres de canal y contadores en loopback. Los logs nativos descartan payloads y claves; tres rechazos MLS en diez segundos detienen el bot sin reconexión automática.

GET /api/state devuelve receptor, participantes, audio y fuentes. PUT /api/slots/1..7 guarda ajustes validados y exige cabecera X-VF-Panel y origen local. El servidor solo escucha 127.0.0.1 y no habilita CORS.

Recepción DAVE real confirmada con un usuario. Siguen pendientes: dos usuarios hablando por turnos y simultáneamente, fuentes en Streamlabs, mute/salida/reentrada, estabilidad diez minutos y clasificación de descartes MalformedFrame. Compilar o probar en modo demo no aprueba estas condiciones.

## Comprobaciones
- `dotnet run --project tests/LevelsProbe/LevelsProbe.csproj -c Release`: niveles, diagnóstico, asignación y persistencia.
- `node tests/avatar-view-probe.mjs`: visibilidad, opacidad, nombre, desconexión y preview del renderer.
- `scripts/smoke.ps1` (PowerShell 7): doctor y comprobación HTTP GUI/fuentes con demo aislada en puerto 17862. No conecta a Discord ni toca asignaciones reales.
- La apariencia visual de la ventana y el resultado en Streamlabs deben verificarse en el equipo del usuario.

## Fuentes
- https://github.com/discord-net/Discord.Net/pull/3288
- https://docs.discordnet.dev/guides/voice/libdave.html
- https://github.com/discord/libdave/blob/v1.2.1/cpp/cpp/includes/dave/dave.h
- https://github.com/discord/libdave/blob/v1.3.0/cpp/cpp/includes/dave/dave.h
- https://dotnet.microsoft.com/en-us/platform/support/policy

## Tamaño y etiquetas de la fuente
Usa 400 x 300 en Streamlabs por cada fuente. Panel y fuente comparten una composicion adaptable: si eliges 200 x 200 se reduce proporcionalmente sin cortar avatar/nombre, pero el texto se vera mas pequeño. La etiqueta aparece arriba del avatar. El interruptor Etiqueta de nombre esta visible en cada tarjeta y se guarda con el resto de ajustes.
Tras actualizar archivos de presentacion, recarga el panel y actualiza la fuente de navegador de Streamlabs para que cargue los nuevos estilos.
## Efectos y actualizaciones de fuentes
Ver EFFECTS.md para la instalación inicial del recargador automático, etiquetas con borde negro, tamaño/opacidad del nombre, animaciones Pop elástico/Llamas de dragón y selección de sonidos locales por evento. La composición lógica es 400x300 y escala a la resolución de la fuente; para HD usa1440x1080 con la mismaURL.
Los sonidos incluidos son sintetizados originalmente por la app. Los personalizados se copian a .local/sounds, con identificadores relativos y validación de tipo/tamaño. No se copian al publicar, igual que las asignaciones.
## Avisos y presencia
El panel presenta avisos acumulados desde el arranque, avisos de los ultimos 60 segundos y causas clasificadas. Los contadores de voz no son errores de animacion. La presencia se calcula con ConnectedUsers (usuarios conectados), no con Users (acceso al canal de texto). Entrada y salida visuales fueron confirmadas por el usuario en Streamlabs; los avisos DAVE/paquetes restantes siguen expuestos y pendientes de clasificacion completa.
## Dragon Puppet 2D
Disponible Cian · Puppet 2D con controles de alas, respiracion, boca, expresiones y mirada. Detalles del rig y limites en [PUPPET.md](PUPPET.md).

## Entradas y salidas cinematograficas
En Entrada, salida y sonidos hay tres nuevas opciones: Invocación · pentagrama y fuego, Tormenta · nube y relámpagos y Dragón celestial · haz de invocación. Selección independiente para entrar/salir, controles de calidad, intensidad, velocidad, escala, densidad y color. Tras actualizar, reinicia el receptor una vez. Usa Probar entrada/salida antes de probar la presencia real en Streamlabs. Detalles y límites en [EFFECTS.md](EFFECTS.md).

## Adornos y diagnóstico persistente
El apartado Adornos permite combinar runas, orbes, brasas, viento y arcos con ajustes por fuente. El registro de avisos de Discord queda en .local/logs/discord-diagnostics.jsonl y rota automáticamente. Detalles sobre qué significan los contadores y cómo leerlos en [DIAGNOSTICS.md](DIAGNOSTICS.md). Tras instalar esta versión, reinicia una vez el receptor.

## Panel: rendimiento y edición
Puedes activar Modo rendimiento para ocultar y detener las vistas previas locales. Esto no pausa las fuentes de Streamlabs. Boca y encuadre conserva los ajustes de apertura/margen; la edición de piezas por coordenadas queda oculta hasta contar con una herramienta visual. El medidor de voz mantiene tamaño fijo. Los adornos ajustan automáticamente su órbita al marco lógico400x300; arcos entre cuernos retirado. Cian incluye toggles/intensidad de brillo para ojos y patrónceleste separados, en sus controles Puppet.

## Accesorios
En cada fuente Puppet 2D, abre Accesorios y elige lentes redondos/de sol, sombrero de mago/de copa y collar de cuero/con gema. Cada categoria admite Ninguno y se guarda por fuente. Los lentes y sombreros heredan la cabeza (incluida su edicion); el collar hereda el torso. Se dibujan dentro del mismo render HD y encuadre, y participan en entrada/salida. Requiere reiniciar el receptor tras actualizar para aceptar los tres campos nuevos. Por ahora disponibles en Cian Puppet; los demas diseños siguen siendo referencias.

### Ajustar accesorios y objetos
Abre Accesorios → Ajustar accesorios. Selecciona la pieza, arrastra su contorno dorado y ajusta tamaño/giro. El Puppet permanece en reposo; las demás piezas están bloqueadas. Aplicar guarda por fuente, modelo de Puppet e ID; Cancelar no modifica el directo. El Objeto incluye un micrófono de escenario con idle quieto/flotación/balanceo y controles de intensidad/velocidad. La casilla de prueba solo anima el objeto del editor.
Los archivos editables y el catálogo están en src/VtuberFriends/wwwroot/accessories (o wwwroot/accessories junto al ejecutable portable). Lee LEEME.md en esa carpeta para editar SVG, usar PNG y agregar variantes sin código. No hay nuevos puppets en esta entrega.

Dos objetos: Objeto izquierdo y Objeto derecho usan el mismo catálogo accessoryObject y pueden seleccionar el mismo archivo simultáneamente. Izquierda/derecha se refiere a la pantalla. Cada lado tiene ajuste e idle independientes. El objeto único anterior conserva su identidad y ajustes en la derecha; la izquierda empieza en Ninguno. Para añadir objetos basta una entrada de catálogo: se ofrece en ambos lados, sin duplicar el SVG/PNG.

## Jade celestial · Puppet 2D
Segundo Puppet seleccionable desde Avatar, sin sustituir Cian. Cuerpo serpentino continuo con deformación suave de cuello/espiral/cola y aletas independientes. Movimiento espontáneo controla la intensidad de la ondulación; Alas controla aletas. Boca, mirada, pestañeo, accesorios, etiquetas y transiciones se reutilizan. Ojos separados: fondo oscuro, esclerótica fija, iris con pupila móvil y dos párpados por ojo, enmascarados por los huecos transparentes de la cabeza.
Las piezas activas se exportan a art/avatar-parts/jade-dragon con scripts/export-puppet-parts.ps1 -Pack jade-dragon. Los originales activos están en src/VtuberFriends/wwwroot/puppets/jade-dragon. Son reconstrucciones generativas de la referencia aprobada; notas/prompts y hashes en esa carpeta. Mantén la fuente de Streamlabs en 1440×1080. Reinicia el receptor para habilitar la selección del modelo nuevo.

## Ámbar · Puppet 2D
Tercer Puppet seleccionable, con rostro redondo amistoso y torso más ancho. Las cejas doradas son piezas independientes y siguen la expresión elegida (feliz, enfadado, sorprendido, curiosidad) y pequeños gestos de mirada/voz. Ojos: respaldo oscuro, fondo marfil fijo, iris/pupila oval móvil y párpados separados.
La cabeza contiene el hocico completo. Una boca geométrica delante de él interpola sonrisa→abertura con interior y lengua; no hay mandíbula separada ni una boca fija dibujada debajo. Dos colmillos independientes siguen el labio superior. Conserva controles de sensibilidad y apertura máxima, accesorios por modelo, transiciones y fuente1440×1080.
Reinicia el receptor tras actualizar y elige Ámbar en Avatar. Las piezas se encuentran en art/avatar-parts/amber-dragon, los activos en src/VtuberFriends/wwwroot/puppets/amber-dragon; allí también están prompts de ImageGen, procedencia y explicación del montaje. No se reasignan fuentes existentes.

### Perfiles de accesorios por modelo
Cada fuente recuerda un perfil distinto para Cian, Jade y Ámbar: selección de accesorios y movimiento de objetos. Posición/tamaño/giro siguen separados por ID de modelo y accesorio. Al cambiar de avatar se recupera su perfil; un modelo nuevo empieza sin accesorios. Las posiciones anteriores se conservan y la selección legacy se migra al modelo activo, sin inventar selecciones antiguas para otros modelos. El editor identifica el Puppet en su título y solo aplica sus ajustes, incluso si cambió el modelo desde otra ventana. Requiere reiniciar el receptor para guardar perfiles.

## Thoxer · Puppet 2D
Cuarto Puppet, basado en la referencia cibernética aprobada. Cabeza con mirada entrecerrada, cejas metálicas asimétricas separadas, ojos por capas y boca de superficie como Ámbar, sin mandíbula aparte. No tiene lentes incorporados: selecciona Accesorios → Lentes → Rectangulares · Thoxer para recuperar ese aspecto. Son SVG editables en wwwroot/accessories/glasses-rectangular.svg y mantienen ajustes por modelo/fuente.
En Brillo, Thoxer incluye Brillo cibernético · respiración con interruptor e intensidad. Pulso suave4.8s en núcleo y detalles verdes, sin brillo global sobre titanio ni membranas azules. Activado por defecto solo en Thoxer. Requiere reiniciar receptor para aceptar modelo/campos nuevos. Piezas limpias en art/avatar-parts/thoxer-dragon; referencia original, prompts y procedencia en src/VtuberFriends/wwwroot/puppets/thoxer-dragon.

## Ascua · Puppet 2D
Nuevo dragón de fuego por capas, con pupilas y fondos separados, párpados opacos, cejas independientes y sonrisa interpolada sin mandíbula separada. Seleccionar Ascua en Avatar tras reiniciar el receptor. Conserva perfil propio de accesorios. Piezas en art/avatar-parts/ember-dragon; referencia original y notas de generación en el pack activo.

## Remiendo · Puppet 2D
Dragón amarillo y verde lima de tela tejida, con costuras, parches y mascada azul paisley blanco en capa propia anclada al cuerpo. Ojos/fondos/párpados separados, sonrisa curva interpolada sin jaw y dos colmillos de fieltro. Reiniciar receptor y elegir Remiendo en Avatar. Perfil independiente de accesorios. Piezas en art/avatar-parts/patch-dragon; originales, concepto y prompts en el pack activo.

## Rosalía · Puppet 2D
Dragona rosa/dorada desde referencia, cabello por capas y ojos por encima del flequillo con pestañas independientes. Sonrisa asimétrica interpolada sin jaw, dos colmillos, antenas con balanceo propio y mechones con movimiento suave. Destellos animados en dos capas que se deforman con las alas, sin temporizadores adicionales. Seleccionar Rosalía tras reiniciar el receptor; perfil propio de accesorios. Piezas y prompts en art/avatar-parts/rose-dragon.

## Preparar un invitado antes de que entre
En cada tarjeta, abre «Asignar antes de entrar», pega su ID de usuario de Discord y pulsa «Preparar invitado». El ID se copia desde su perfil con el modo desarrollador de Discord activado; no uses el ID del canal o servidor. Elige el Puppet y copia la fuente a Streamlabs. Preparar activa Mostrar, pero la fuente sigue oculta hasta que esa persona esté presente en el canal y el receptor conectado. La asignación se guarda y se reutiliza en futuras entradas/inicios; el nombre real se obtiene cuando aparece en Discord. No es necesario que instale la app.

Rosalía revisión2: copete/flequillo integrados en la cabeza para evitar flotación, abertura ocular más entrecerrada y maquillaje visible. Melena más abundante con raíces amplias y movimiento relativo reducido; torso más ancho y cuello corto. Alas, destellos y sonrisa lateral conservan los valores anteriores.

Rosalía: las pestañas superiores comparten una imagen maestra (reflejada en el ojo derecho), ajustada por curva al borde real y recortada fuera del hueco ocular. Colmillos blancos sencillos. Para retocar arte, ver art/avatar-parts/rose-dragon/lashes-upper.png y fang-white.png; conservar transparencia/lienzo. Esa carpeta es una exportación de trabajo, no se importa automáticamente. El ajuste del contorno se recalcula al integrar cambios mediante scripts/assemble-rose.py.

## Boreal · Puppet 2D
Dragón de hielo turquesa basado en referencia aprobada. Conserva cuerno grande a izquierda de la imagen y pequeño a derecha, cabello unido a cabeza, cejas diferentes y ojo izquierdo más entrecerrado. Fondo/iris/párpados separados; ambos iris tienen igual tamaño, con distinta oclusión. Sonrisa lateral interpolada sin jaw y dos colmillos blancos. Perfil propio de accesorios. Reiniciar el receptor y seleccionar Boreal en Avatar. Piezas y prompts en art/avatar-parts/frost-dragon.

## Jade shiny
En Jade celestial, abre Puppet 2D → Color del avatar y activa «Jade shiny». La variante convierte las zonas verdes a negro/obsidiana conservando los detalles dorados/rojos y los ojos. Es el mismo Puppet: mismos PNG, rig, animaciones, transparencia, encuadre y ajustes de accesorios. El interruptor se guarda por fuente; apagándolo recuperas el verde original. Tras instalar esta versión hay que reiniciar una vez el receptor para guardar la nueva opción. Los PNG exportados siguen verdes porque la paleta se aplica al renderizar.

## Ampliación de fuentes
Ahora hay **7 fuentes** por defecto. Al cargar una configuración anterior con 6, se añade una séptima vacía y desactivada, conservando las asignaciones y ajustes existentes. El siguiente guardado persiste el conjunto ampliado. Reinicia el receptor para verla; su URL es http://127.0.0.1:17861/overlay/7.

El límite está centralizado en `AvatarStore.DefaultSlotCount`; el panel usa la cantidad de fuentes recibida del servidor. Esto permite ampliarlo en una versión futura con la misma migración aditiva. Todavía no hay un botón para añadir fuentes a voluntad.


## Auras, objetos y biblioteca de sonidos — 2026-11-20
- Nuevo apartado «Auras, humo y rayos»: aura ascendente de color, círculo de humo a los pies, rayos y humo nasal ocasional. Todos apagados inicialmente.
- «Ajustar efectos» abre el editor de arrastrar en reposo. Posición, tamaño, giro, color, intensidad y velocidad independientes por modelo y fuente. El humo nasal añade intervalo (8–90 s, 22 por defecto) y separación de fosas; acompaña a la cabeza. La vista de edición repite el humo cada 6 s para colocarlo.
- Los límites completos del efecto entran en el autoencuadre; se reserva espacio incluso entre emisiones para evitar que la cámara cambie continuamente. Auras/rayos detrás; humo nasal delante. Conserva fuente HD 1440×1080, proporción 4:3.
- Accesorios SVG editables en `src/VtuberFriends/wwwroot/accessories`: vaper, teléfono con tres reels ilustrados/likes sin marca, palo, espada, esfera de captura, teddy, galaxia animada, corona de gemas y sombrero de mago rehecho. Objetos disponibles en ambas manos. No se conectan a ninguna red social.
- Animación de efectos integrada en el reloj/render del Puppet, sin otro RAF/canvas. Texturas compartidas entre izquierda/derecha; al ocultar/liberar el Puppet se detienen sus efectos. El modo rendimiento conserva las fuentes del directo.
- Los perfiles por modelo ahora conservan también adornos, piezas/encuadre, movimiento y glows, además de accesorios e idle. Los ajustes existentes del modelo activo se conservan; no se activan efectos nuevos automáticamente.
- Carpeta portable `Sonidos`, junto a `config.json`: copia WAV/MP3/OGG/M4A/WEBM de hasta10MB, sin subcarpetas. La biblioteca se carga al abrir el panel y al pulsar Actualizar biblioteca, sin sondeo periódico. IDs estables por nombre, contenido validado; no se publican rutas del equipo. Los archivos importados previamente en `.local/sounds` siguen funcionando. `publish.ps1` prepara la carpeta vacía con instrucciones.
- Todavía no se han convertido las posiciones personales en defaults de distribución. Hacerlo después de la configuración final del usuario, antes del paquete para su amigo. Nunca incluir token ni datos privados en ese paquete.

## Rendimiento y transporte
Los niveles, presencia y estado usan WebSocket compartido: una captura/serialización del servidor a30Hz para todas las fuentes, ajustes solo al cambiar y diagnóstico a1Hz. Un cliente lento conserva solo el último fotograma, sin cola creciente. El panel pausa su conexión al ocultarse. La actualización de recursos usa avisos de Windows y confirmación de versión bajo demanda, sin sondear archivos o versiones constantemente.

Los accesorios decodifican y suben texturas solo cuando se seleccionan. Los efectos procedurales no cargan sus imágenes placeholder. El encuadre se calcula una vez por pose, con extremos analíticos por columna donde la deformación es cuadrática y muestreo completo para Jade serpentino. Se conserva el render fluido y el modo rendimiento del panel.

Pruebas sintéticas y análisis reproducibles: tests/runtime-performance-probe.mjs, tests/framing-performance-probe.mjs y artifacts/performance-report.json. No sustituyen una medición de GPU en Streamlabs ni la validación DAVE real con dos usuarios.

## Parches incrementales
Desarrollamos en este repositorio y generamos un ZIP delta contra una distribución conocida con scripts/make-patch.py. El primer parche es Distribucion/Parches/vf-20261120-hacker-01.zip, para la distribución Windowsx64 entregada antes de añadir Hacker. Cambia solo VtuberFriends.dll y wwwroot/vfx/cinematic.js; no reenvía modelos/runtime.

El destinatario cierra la aplicación desde Configuración, extrae TODO el ZIP junto a VtuberFriends.exe y abre Aplicar parche.exe. El lanzador usa el runtime que ya acompaña a la app, verifica hashes/versiones, conserva datos personales y respalda archivos reemplazados en .updates/backups. Puede restaurar con Restaurar parche.exe; antes debe cambiar Hacker a una animación antigua como Pop para que la versión anterior lea sus ajustes.

Hacker · ensamblaje cibernético aparece en Entrada/salida: circuitos, columnas de código, barrido holográfico y materialización del Puppet real. Respeta color, velocidad, intensidad, escala y calidad existentes. No se selecciona automáticamente ni mantiene efectos después de la transición.

## Modo prueba para organizar Streamlabs
En el panel, activa **Modo prueba · mostrar invitados ausentes**. Las fuentes existentes muestran en reposo solo avatares asignados con **Mostrar** activo, aunque el bot esté desconectado o el invitado no esté en Discord. Respeta tamaño, opacidad, accesorios, nombres conocidos y todos los ajustes del modelo. No cambia las URLs ni escenas de Streamlabs.

El modo se comparte con todas las fuentes, sin añadir parámetros a sus URLs, y no simula voz ni reproduce sonidos de entrada/salida. Apágalo antes del directo para volver a presencia/audio reales. Se desactiva al reiniciar la app y no escribe config.json ni avatars.json. El modo rendimiento del panel sigue siendo independiente.

Parche desde Hacker: Distribucion/Parches/vf-20261120-test-mode-02.zip. Desde la versión original: vf-20261120-test-mode-base-02.zip (incluye también Hacker como opción, apagada). Usar solo el ZIP correspondiente; cerrar la app, extraer junto al ejecutable, abrir Aplicar parche.exe y reiniciar.

## Octava fuente — parche03
La fuente8 aparece vacía y desactivada, manteniendo las siete anteriores. Asigna un usuario, activa Mostrar y copia su URL /overlay/8 a una nueva fuente de navegador. Funciona con el modo prueba y los mismos Puppets/accesorios.

Entrega acumulativa desde la versión original: Distribucion/Parches/vf-20261120-fuente8-base-03.zip (Hacker + modo prueba +8fuentes). Desde cualquiera de los parches modo prueba02: vf-20261120-fuente8-03.zip. Desde Hacker01 únicamente: vf-20261120-fuente8-hacker-03.zip. Elegir solo el ZIP de la versión instalada.

Los parches no reemplazan configuración/token/sonidos ni escenas de Streamlabs. Al guardar, la app conserva1..7 y añade la fila8. Si ya se guardaron ocho filas, el restaurador bloquea volver a una versión de siete para impedir pérdida de datos; no borra ni trunca la configuración.

## Cierre completo con la X — parche04
La ventana principal mantiene una conexión de ciclo de vida separada del flujo de estado. Cerrar el último panel termina la aplicación; las fuentes de Streamlabs no la mantienen viva. Minimizar no corta esa conexión. Una recarga dispone de2segundos para reconectar, y varias ventanas se cuentan por separado. No se matan procesos de Edge ni otras aplicaciones.

El cierre cancela una conexión Discord en curso y limita las esperas de limpieza al salir. Si una limpieza no responde, se registra una categoría sanitizada, sin bloquear indefinidamente la salida. No se cambia el comportamiento de reconexión normal.

Con fuente8/parche03: Distribucion/Parches/vf-20261120-cierre-04.zip. Desde la distribución original: cierre-base-04.zip incluye todos los cambios previos. Para cerrar una instancia anterior que quedó sin ventana, abre de nuevo VtuberFriends.exe y usa Configuración > Cerrar aplicación antes de instalar. Los datos y las URLs existentes se conservan.

## Recuperar recepción de voz (audio05)
La app supervisa los lectores y la conexión, vuelve a asociar streams y puede reconectar voz con un máximo de3intentos por10min separados60s. No interpreta silencio como fallo. Un rechazo MLS/DAVE detiene la recuperación automática. Si aparece recuperación pausada, usa Configuración > Reconectar audio: conserva token, canal, avatares y fuentes. El panel muestra lectores activos y tiempo desde el último PCM; un tiempo alto durante silencio es normal. Si vuelve a ocurrir, conservar .local/logs/discord-diagnostics*.jsonl del equipo afectado para investigar; nunca compartir el token.
