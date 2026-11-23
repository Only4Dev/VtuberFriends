# Etiquetas, transiciones y sonidos

## Actualizaciones automáticas de la fuente
Esta versión incorpora un actualizador dentro del panel y de cada fuente. Detecta cambios en los recursos, espera una versión estable y recarga usando una URL con versión para evitar la caché de Streamlabs. Los estilos y las importaciones de módulos también llevan esa versión.

**Instalación inicial:** reinicia el receptor y actualiza una última vez la caché de cada fuente antigua en Streamlabs. Esas páginas anteriores no tienen el actualizador y no pueden recargarse por sí solas. Después, mientras la fuente esté activa y el receptor accesible, los cambios deberían cargar solos en unos 4–6 segundos. No se cambian las URLs que copias del panel.

El panel espera si hay ajustes sin guardar o un sonido importándose. Cambiar una asignación, opacidad o sonido no recarga la página: se aplica desde la API. Una recarga rápida conserva el estado de presencia para no repetir la entrada de un usuario que ya estaba visible. Las fuentes apagadas por Streamlabs no ejecutan actualizaciones ni eventos hasta que vuelvan a cargarse.

## Etiqueta de nombre
El interruptor visible activa o desactiva el nombre. Abre el desplegable **Etiqueta de nombre** para elegir:
- Placa con marco.
- Letras con borde negro, sin placa.
- Tamaño de letra de 8 a 36 unidades del diseño.
- Opacidad del nombre de 0 a 100%.

La opacidad general del avatar sigue afectando a toda la fuente; la del nombre se aplica adicionalmente a la etiqueta. El diseño se ajusta al área disponible para no recortarse con nombres grandes. Tamaño recomendado de cada fuente: **400 × 300**.

## Entrada y salida
Abre **Entrada, salida y sonidos** en la tarjeta. Cada evento tiene su propio selector:
- **Pop elástico:** nace desde un punto central, crece con un rebote corto y se estabiliza. Al salir, se comprime y desaparece con un anillo de burbuja.
- **Llamas de dragón:** fuego estilizado, brasas y un rebote; también disponible al salir.
- **Sin animación**.

Son efectos originales SVG y Web Animations, sin dependencia de CDN ni librerías de pago. El registro en transitions.js centraliza las animaciones y sus nombres para añadir otras; el esquema de AvatarStore valida los identificadores admitidos.

El evento se dispara al aparecer/desaparecer una fuente asignada (entrada/salida del canal o activar/desactivar Mostrar), no con cada cambio del micrófono. Una salida mantiene el último avatar y nombre hasta terminar y luego deja fondo transparente. Reentrar durante una salida cancela la salida anterior. La pérdida de conexión oculta inmediatamente y en silencio.

**Probar entrada / Probar salida** muestra el efecto en la tarjeta; no cambia la visibilidad de la fuente de Streamlabs. El preview no reproduce eventos automáticamente, para evitar duplicar el sonido del directo.

## Sonidos
Cada evento permite:
- Sonido suave incluido: sintetizado originalmente por la app, sin grabaciones de terceros.
- Sin sonido.
- Archivo personalizado: **Elegir archivo…** abre el selector del equipo.

Se admiten WAV, MP3, OGG, M4A o WEBM, hasta 10 MB. La app copia el archivo elegido a .local/sounds, guarda un identificador relativo y muestra el nombre original. No depende de que siga existiendo la carpeta de origen en el PC. Cambiar a otro sonido o a Sin sonido conserva la referencia del último archivo importado para volver a seleccionarlo.

**Escuchar** prueba únicamente el audio; el volumen de efectos se controla por avatar. Cambios se guardan con las asignaciones en .local/avatars.json.

En Streamlabs los sonidos se reproducen desde la fuente de navegador. Para mezclarlos por fuente, activa **Controlar audio vía Streamlabs Desktop** y revisa su canal en el mezclador. Si solo quieres probar en el panel, usa sus botones. La reproducción automática depende de las políticas del navegador/CEF: no se fuerza ni se evita esa protección. Si el navegador bloquea una prueba, el panel avisa; en una fuente se registra un aviso en su consola sin dibujar texto en el stream.

La compilación, persistencia, ciclo de transición, invalidación de recursos, formato/importación de audio y rangos HTTP tienen pruebas. El aspecto final y la reproducción real de audio en Streamlabs requieren prueba del usuario.

## Tres secuencias cinematograficas (2026-11-19)
En Entrada, salida y sonidos selecciona independientemente:

- **Invocación · pentagrama y fuego**: anillos y runas sobre un plano de suelo, pentagrama trazado, lenguas de fuego y brasas, revelado luminoso del Puppet. Al salir se desmaterializa sobre el sello y las brasas ascienden.
- **Tormenta · nube y relámpagos**: nubes de humo con densidad procedural, rayos ramificados y remolinos que se apartan para revelar al dragón; al salir lo envuelven y se disipan.
- **Dragón celestial · haz de invocación**: guardián serpentino articulado que recorre una espiral, con escamas, patas, astas, melena y bigotes; haz descendente que invoca al avatar. En salida el haz asciende y el guardián se retira.

Duraciones de base: entrada3/3/4.4s, salida2.6/2.7/3.9s. Velocidad0.6–1.5x, intensidad20–100%, escala65–115%, densidad25–100%, calidad ligera/equilibrada/alta y color de energía personalizado. Color predeterminado conserva la paleta de cada secuencia. Calidad ajusta resolución de lienzos y límite de partículas; densidad regula cantidad. El tamaño de fuente sigue400x300. No se cambian automáticamente los efectos elegidos antes de actualizar.

Reinicia el receptor una vez para aceptar IDs/campos nuevos. Prueba con los botones Probar entrada y Probar salida; después prueba salir/reentrar al canal mirando Streamlabs. La prueba del panel no dispara eventos en la fuente. Se conservan sonidos y volumen existentes; puedes importar tus propios sonidos para estas secuencias.

### Implementación y verificación
vfx/cinematic.js dibuja en dos Canvas2D delante/detrás del actor. El sello tiene geometría animada y runas; el humo se hornea una vez con ruido multiescala en un lienzo160x160 y se reutiliza. El guardián se dibuja sobre72 puntos de columna con detalle articulado. Tres escenas comparten reloj normalizado, estado de revelado, partículas precalculadas y rutina de limpieza. Máximo120partículas y32volúmenes de nube; dos lienzos por transición. No se carga una biblioteca en la app ni se llama a un servidor externo para dibujar efectos.
El shader del Puppet aplica disolución por ruido/progreso con borde de energía, manteniendo sus capas y animaciones. El loop sigue dibujando durante una salida aunque el participante ya esté ausente; al acabar vuelve a suspenderse. Avatares SVG clásicos usan recorte progresivo de su propio dibujo. Cancelar restaura máscara/nombre/actor, quita lienzos y limpia RAF/timer; el número de transición evita que una salida vieja oculte una reentrada nueva.

Pruebas: cinematic-probe recorre ambas direcciones, límites, dibujo con stub, cancelación y reentrada; pruebas .NET/HTTP verifican persistencia de los tres IDs y controles. Las interfaces GLSL se verifican en ramas de precisión alta y media. Fotogramas reales de los pintores Canvas2D fueron renderizados con Skia local y revisados en artifacts/vfx/contact-sheet.png; muestran solo efectos, no certifican composición final ni shader GPU en Streamlabs. Falta valoración visual del usuario y rendimiento real con múltiples fuentes. Sin declaración de60fps.
Para regenerar la hoja, tests/render-cinematic-preview.mjs usa opcionalmente [@napi-rs/canvas](https://github.com/Brooooooklyn/canvas) instalado solo en .tools/vfx-preview; no se distribuye con la app. La app usa Canvas2D del navegador.
Los VFX ambientales constantes, habilidades y presets elementales del roadmap siguen para una iteración posterior.

## Adornos persistentes
Abre **Adornos · energía alrededor del avatar** en cada tarjeta. Puedes combinar runas flotantes, orbes de energía, brasas etéreas, corrientes de viento y arcos entre cuernos. Controles por fuente: intensidad, tamaño, velocidad, color y calidad. No hay adornos activados por defecto y no se modifican tus selecciones anteriores.

Las runas/orbes/viento se reparten en dos capas delante y detrás del cuerpo. Los arcos siguen puntos de los cuernos del rig. El módulo usa anchors definidos en rig.json y proyectados por anchors.js con la transformación facial actual, edición de piezas y margen de canvas. Hay anchors de boca, corona, cuernos y cuerpo; el punto de boca queda disponible para una futura habilidad, sin implementar aún fuego por grito.

AmbientLayer comparte un RAF entre vistas activas, preasigna48semillas, limita brasas a16/26/40 y orbes a3/4 según calidad. Suspende dibujo fuera de pantalla o al ocultar la página, libera los dos lienzos al desactivar y reemplaza recursos al cambiar calidad. Los adornos se apartan durante las entradas/salidas para no saturar la composición. Avatares clásicos usan puntos proporcionales cuando no tienen rig.

Reinicia una vez para cargar campos nuevos. Las pruebas cubren persistencia, validación, anclaje al giro de cabeza, activación/desactivación y limpieza. Los pintores fueron renderizados con CanvasSkia y revisados en artifacts/vfx/ambient-contact-sheet.png (solo efectos). La composición completa y el rendimiento de varias fuentes siguen pendientes de revisión en Streamlabs; no se declara60fpsmedido.

## Limpieza del panel y encuadre de adornos
**Modo rendimiento · ocultar vistas previas** es una preferencia local del panel. Al activarlo se cancelan pruebas visuales y se liberan los renderizadores de los avatares/adornos de ese panel; las fuentes de Streamlabs siguen funcionando por separado. Se reduce la frecuencia de consultas/render del panel. Los botones Probar entrada/salida quedan desactivados mientras la vista previa está pausada; Escuchar sonido sigue disponible. Al desactivarlo, las vistas se reconstruyen con los ajustes guardados.

El apartado de coordenadas por pieza se sustituye temporalmente por **Boca y encuadre**, con apertura máxima y margen. Se conservan los ajustes de piezas guardados; no se borran ni se alteran los PNG. La herramienta visual de selección/highlight/arrastre queda pendiente, no implementada. El indicador VOZ reserva anchura/altura y muestra −∞dB en silencio para evitar saltos de layout.

Los adornos calculan el límite de toda su órbita, incluido el halo, y ajustan tamaño/desplazamiento dentro del escenario400x300 con8pxde margen. El cálculo no depende del ángulo instantáneo, evitando cambiar de escala a cada vuelta. El control Tamaño del adorno sigue disponible. No se requiere aumentar la resolución de la fuente. **Arcos entre cuernos** se retira del pintor y selector; las configuraciones antiguas lo filtran al cargar/guardar conservando los demás adornos.

## Glow selectivo del Puppet
En Puppet2D · movimiento y expresión abre **Brillo · ojos y patrón celeste**. Hay dos interruptores y dos intensidades independientes. Por defecto están apagados. El patrón usa una máscara por color del material cyan; las zonas obsidiana/mandíbula/colmillos no participan. Los ojos emiten desde sus texturas blancas y la intensidad cae al cerrar los párpados. No se usa un filtro sobre todo el avatar.
El shader realiza pasadas suaves de emisión alrededor de los píxeles seleccionados. Desactivados no añaden pasadas de dibujo. Requiere reinicio del receptor para guardar los nuevos campos. Pruebas verifican estado de pasadas, selección de capas, supresión al parpadear y compatibilidad de interfazGLSL; no sustituyen la compilación/inspección en laGPU real del usuario.

## Fuente HD y encuadre del cuerpo
En Propiedades de la fuente de navegador de Streamlabs usa **1440×1080**. Conserva laURL y reduce con las esquinas en la escena hasta el tamaño deseado. Mantiene proporción4:3. Para menor consumo usa800×600.400×300 sigue funcionando como salida ligera, pero ampliarla mucho puede pixelar el resultado.

El tamaño lógico sigue400×300 para mantener posiciones y configuraciones. raster.js asigna píxeles según el tamaño real de salida/DPR: Puppet se ajusta al tamaño de su cuerpo renderizado, adornos y escenas se ajustan al de la fuente. Calidad limita lienzos a1024/2048/3072pxde ancho. No se inventan detalles nuevos del PNG al ampliar. Las texturas existentes conservan límite2048; el arte original no se regenera.

Además del ajuste de órbitas/halos, framing.js calcula la envolvente de los vértices de malla8×8 realmente deformados, incluidos los passes deglow. Amplía la cámara cuando es necesario para contener cabeza/alas/mandíbula/piezas editadas. Durante movimiento conserva el mayor encuadre observado y no vuelve a acercar la cámara a cada respiración. Cambiar explícitamente margen/edición recalcula ese espacio. Anchors y cámara comparten proyección para evitar separar adornos del personaje. Se conserva también el ajuste de ancho/alto del contenidoCSS.
PruebasCPU validan contención en poses extremas y resolución/caps en fuenteHD, y se repiten probes de presencia/transiciones/piezas. No equivale a un benchmarkGPU/inspección visual de Streamlabs.
