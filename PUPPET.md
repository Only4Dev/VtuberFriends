# Puppet 2D cian

Selecciona **Cian · Puppet 2D** en cualquier fuente. Conserva asignación de Discord, sensibilidad, etiquetas, presencia, efectos y sonidos. Fuente recomendada HD: 1440 × 1080 (composición lógica 400 × 300).

El panel incluye intensidad de reposo/respiración, alas, ganancia de boca, rango de cabeza, expresiones y controles manuales de cabeza/mirada. Los ajustes se comparten con las fuentes.

## Capas y rig
La referencia original se conserva en wwwroot/puppets/cyan-dragon/reference.png. ImageGen reconstruyó trece PNG transparentes; no son una separación sin pérdida del original. rig.json contiene quince piezas: las trece texturas y dos fondos oscuros de ojos. provenance.json registra hashes.

Orden: alas y torso; fondos oscuros, ojos blancos, párpados superiores e inferiores; cabeza con huecos transparentes; cavidad de boca, mandíbula. Los colmillos superiores comparten la malla del hocico. Los párpados se desplazan como cortinas; los ojos blancos conservan su altura al parpadear. El hocico superior contiene solo su labio y colmillos unidos; la cavidad, lengua y mandíbula son piezas separadas.

puppet/controllers.js mezcla reposo, mirada, parpadeo, expresiones y RMS continuo con prioridades y suavizado temporal. rig.js aplica pivotes/jerarquía; renderer.js deforma mallas WebGL 8×8, con raíz y punta ponderada por ala. player.js comparte carga y ciclo de animación, pausa fuera de pantalla y libera recursos. Sin WebGL se muestra la referencia estática y se informa del fallo.

Los cuernos y crestas pertenecen a la malla de cabeza, no tienen articulación individual. La perspectiva es deformación 2D, no un modelo 3D. El objetivo es fluidez a 60 Hz; no se ha medido rendimiento GPU en Streamlabs. Las pruebas sintéticas no sustituyen la revisión visual del usuario ni la validación DAVE real.
## Revision de boca 3

La revision anterior seguia mostrando piezas separadas. Ahora el borde superior dentado y sus cuatro colmillos comparten la textura head-v3.png y la misma malla: no existe un nodo de colmillos flotante. La cavidad cavity-v3.png no incluye labios, dientes ni lengua. tongue-v3.png y jaw-v3.png son capas independientes. Orden de oclusion: cavidad, lengua, mandibula y cabeza/hocico superior. La mandibula deforma su centro hasta 55 unidades manteniendo las comisuras; la cavidad crece desde su ancla superior y desaparece en silencio. Los cuatro parpados usan texturas *-obsidian.png sin ornamentos celestes.

Estas piezas sustituyen las referencias activas anteriores; los PNG antiguos se conservan como versiones, pero no se dibujan. Los colmillos superiores deben seguir el labio superior, no bajar con la mandibula. La boca ya no utiliza deformaciones independientes de ancho ni inclinacion que separen los bordes. La revision visual final en Streamlabs sigue pendiente.

## Revision 4: dos colmillos separados y apertura recortada
La cabeza head-v4.png no tiene ningun diente. fangs.png contiene exactamente dos colmillos, en nodo upper-fangs hijo de head. Comparte la deformacion facial en coordenadas globales de cabeza; no usa la antigua deformacion calculada por el rectangulo individual de cada pieza. Esto mantiene registro al inclinar/girar la cabeza. Los colmillos son superiores y permanecen sujetos al labio superior mientras baja la mandibula.

La cavidad ahora es un fondo negro solido recortado en shader entre nueve muestras de los bordes superior/inferior. Ya no se dibuja el PNG burgundy con transparencia que sobresalia. La lengua usa el mismo recorte. El centro de la mandibula abre hasta 135 unidades manteniendo comisuras; silencio cierra por completo la cavidad. La apertura RMS usa una curva mas sensible y ataque 12ms/release45ms con suavizado final8/25ms. La fuente consulta estado cada33ms y el panel50ms; el dibujo sigue requestAnimationFrame. El receptor conserva su audio original y no se graba audio. Los contadores de frames evitan mantener un RMS antiguo mas de110ms sin nuevos paquetes.

Miradas cambian cada0.65–2.35s; inclinaciones mas frecuentes, respiracion reforzada y aleteos con modulacion suave. Rango y controles manuales siguen disponibles. Texturas hasta2048px, canvas1536x1024. Esto evita la reduccion anterior a768px: no constituye un upscale IA ni un benchmark de60fps.

Piezas activas para editar/upscale: art/avatar-parts/cyan-dragon (13 PNG mas tres fondos SVG y referencia). Ejecutar scripts/export-puppet-parts.ps1 para actualizar la copia. Conservar proporcion, padding y alpha al ampliar; las UV normalizadas mantienen registro. El export no altera los ajustes de las fuentes.

Investigacion aplicada: parametro continuo abierto/cerrado y amplitud en [Live2D Lip-sync](https://docs.live2d.com/en/cubism-sdk-manual/lipsync/), separacion de apertura y forma en [Motion-sync](https://docs.live2d.com/en/cubism-editor-manual/motion-sync/). Se aplica el principio al rig WebGL propio, sin incorporar el SDK de Cubism.

## Editor de piezas y encuadre
En cada tarjeta Cian, abre **Editar Puppet · piezas y encuadre**. Elige la pieza y cambia posición horizontal/vertical, ancho, alto o giro. Restaurar esta pieza elimina solo su ajuste. Los cambios se guardan por fuente en .local/avatars.json y son compartidos con Streamlabs. No se modifican los PNG ni los pivotes originales.

Pausar movimiento y Probar apertura permiten trabajar sin hablar: afectan solo a la vista previa mientras el apartado permanece abierto y la pausa marcada. Cierra el editor para volver al micrófono. Cada pieza se ajusta independientemente; mover Cabeza no reposiciona automáticamente los ojos y colmillos. Hay controles de apertura máxima y margen de canvas. Mayor margen reduce el tamaño aparente y deja espacio para las alas/cuernos al moverse.

Revision del encaje: la malla de mandíbula se registra con el borde del labio en reposo, mantiene comisuras y reduce el recorrido predeterminado a70. La placa mandibular es menos alta. La lengua se coloca dentro de la nueva abertura. La cámara WebGL usa un viewBox con margen280 por defecto (antes recortaba en los límites originales del arte). Las URL y el tamaño recomendado400x300 se mantienen. El editor y estos ajustes requieren reiniciar el backend una vez tras instalar esta versión.

## Articulacion y limites del lip-sync
La boca utiliza energia relativa de la voz y una puerta minima de ruido. El pico de referencia decae suavemente para que bajar la voz entre silabas cierre la boca aunque el RMS siga por encima del umbral. Esto evita la saturacion anterior con umbrales muy bajos. No se reconoce texto ni se identifican fonemas/visemas: si el audio recibido conserva energia uniforme, no hay informacion suficiente para deducir cada alo. No se generan cierres aleatorios para fingir reconocimiento.
La lengua se ajusta al contorno interior inferior, se ilumina un poco y sigue recortada junto con el fondo mate. Los PNG originales y las ediciones por fuente se conservan. Krisp procesa el audio antes de que lo reciba el bot; una comparacion breve en ambiente silencioso permite evaluar diferencias, sin asumir que sea la causa: https://support.discord.com/hc/en-us/articles/360040843952-Krisp-FAQ

## Fondo opaco y dentadura inferior
La boca incluye ahora mouth-back, una pieza opaca independiente situada delante del cuerpo y detras del interior, lengua y dientes. Permanece opaca incluso cuando la cavidad visible tiene alpha de transicion; el recorte de respaldo solapa12 unidades bajo el labio superior y20 bajo la mandibula. Este solape cubre rendijas sin pintar un rectangulo completo alrededor de la cara. Debe revisarse visualmente en CEF: los tests no certifican pixeles finales.

lower-teeth.png contiene seis dientes inferiores pequenos en una capa separada. La capa sigue el borde de mandibula deformado, comparte su pivote/ajustes del editor, se oculta al cerrar y queda recortada dentro de la boca. Los dos colmillos superiores siguen siendo su propia capa y la cabeza no tiene dientes pintados. Editor: Mandibula y dientes inferiores; Interior y fondo de boca. Las nuevas capas heredan esos ajustes y no necesitan campos nuevos de backend. Export:14PNG y4fondos SVG,18piezas. Prompts en wwwroot/puppets/cyan-dragon/generation-notes.md.

## Rango de dB y estabilidad de vocales
En Puppet 2D · movimiento y expresión, Apertura según la voz ofrece modo automático o rango fijo. Mínimo comparte Umbral de voz: por debajo, boca cerrada. En rango fijo, Máximo determina apertura100%; valores intermedios interpolan en dB. Ganancia1x mantiene esta correspondencia. El servidor exige separación mínima3dB. Modo automático mantiene seguimiento relativo por pico.
Estabilidad de vocales aplica zona muerta a pequeñas oscilaciones de apertura y una meseta suave en el tramo alto del modo automático, sin mantener la boca abierta durante pausas reales. Empieza con50–70% y ganancia1x. Para calibrar rango fijo, observa el medidor de VOZ: mínimo por encima del ruido en silencio y máximo cerca de tu vocal sostenida normal. No se puede deducir el rango exacto de un micro sin medirlo. Los nuevos campos requieren reinicio del receptor; no se modifican los ajustes anteriores al instalar.

## Gestos automaticos
El reposo alterna inclinacion con vuelta al centro, barrido lateral, curiosidad y asentimiento. Vida en reposo regula intensidad y Limite de giro acota cabeza incluida inclinacion Z (hasta15grados). Los controles manuales conservan prioridad. La mirada automatica recorre ambos ejes con pausas al centro; los blancos oculares se desplazan hasta24unidades X y17Y y permanecen detras de las aperturas de cabeza. No se modifica el archivo de ajustes al actualizar.

## Etiqueta outline y reposo final
El contorno del nombre usa sombras negras alrededor del relleno claro, compatible con CEF sin depender de paint-order. La mirada vuelve al centro durante la mayor parte del reposo: los desvios son breves, moderados y ocasionalmente amplios. Se conservan los limites manuales. Cabeza/alas se suavizan ligeramente sin cambiar valores guardados.
