# Workflow de parches que conservan la configuración

Este procedimiento es obligatorio para actualizar instalaciones que ya están funcionando. Su prioridad es mantener las fuentes de Streamlabs, las asignaciones y los ajustes del streamer. Añadir una opción no debe seleccionarla automáticamente.

## Datos que se conservan
| Elemento | Regla |
|---|---|
| config.json | No incluir, sobrescribir, borrar ni regenerar. Mantener servidor/canal/puerto. |
| .local/avatars.json y demás ajustes | Conservar asignaciones, visibilidad, opacidad, perfiles por Puppet, posiciones, tamaños, boca, accesorios, efectos y sonidos elegidos. |
| .local/bot-token.dpapi | Nunca incluir en el ZIP ni reemplazar; no leer tokens personales en pruebas. |
| Sonidos y .local/sounds | Mantener archivos e identificadores personalizados. |
| Streamlabs | No acceder/modificar escenas, dimensiones, posición, escala ni URLs existentes. Conservar IDs de fuentes y rutas /overlay/1..7. |
| Recursos editados por el usuario | Un hash diferente debe detener la actualización de ese archivo; no forzar reemplazos. |

El aplicador puede crear herramientas _patch y respaldos .updates. Los respaldos guardan únicamente los archivos de programa reemplazados, no credenciales ni configuraciones personales. Restaurar una versión anterior tampoco debe reemplazar configuraciones.

## Flujo de desarrollo y entrega
1. Conservar el ZIP exacto de cada versión entregada como baseline inmutable. Extraerlo en una carpeta limpia para desarrollar/verificar diferencias. Nunca usar la instalación configurada de un amigo ni una carpeta de distribución que ya haya generado .local como baseline de prueba.
2. Desarrollar en C:/Dev/VtuberFriends. Mantener esquemas/defaults/IDs/URLs de fuentes. Para un efecto adicional, registrar el nuevo ID y su validación sin cambiar selecciones guardadas.
3. Compilar/publicar la app y el aplicador. Crear una distribución nueva y limpia mediante scripts/make-distribution.py; conservar la versión anterior y sus ZIP.
4. Generar un delta con scripts/make-patch.py --base <baseline-limpia> --new <release-nueva> --id <id-unico> --title <titulo>. Añadir --animation <id> por cada animación nueva.
5. Revisar TODOS los archivos del manifiesto y el ZIP. Solo código/recursos necesarios; nunca configuraciones, tokens ni datos de usuarios. Si cambia el runtime o aparecen dependencias nativas/administradas adicionales, el generador debe rechazar este parche pequeño y hay que preparar una entrega compatible completa que conserve los datos.
6. Probar en una copia temporal derivada del ZIP limpio, con secretos y configuraciones sintéticos. La prueba debe cubrir versión errónea, payload corrupto, ruta privada, app abierta, aplicación repetida, respaldo, fallo a mitad de copia y restauración. No iniciar Discord real ni tocar Streamlabs durante los tests.
7. Prueba obligatoria de configuración: preparar siete fuentes con diferentes modelos, IDs, opacidades, nombres, sonidos, controles de boca, accesorios/posiciones, glows, auras y perfiles inactivos. Comparar el estado completo antes/después de aplicar y arrancar. Los archivos privados deben quedar byte por byte iguales. Seleccionar el nuevo efecto solo puede cambiar el campo solicitado. Verificar todas las rutas anteriores.
8. Entregar el ZIP de parche y pasos breves. El usuario cierra la app desde Configuración > Cerrar aplicación, extrae TODO el ZIP junto a VtuberFriends.exe, abre Aplicar parche.exe y vuelve a abrir la app. Si hay una versión distinta o un archivo modificado, detenerse y generar el parche correcto; nunca forzar.
9. Para restaurar, quitar primero las animaciones nuevas de las fuentes (por ejemplo elegir Pop), cerrar la app y abrir Restaurar parche.exe. El aplicador debe impedir una restauración que deje valores incompatibles con la versión antigua.
10. Registrar baseline, ID, hashes, archivos cambiados, pruebas y limitaciones en CURRENT.md. Para el siguiente parche, la baseline será la última versión efectivamente entregada a ese destinatario.

## Parche Hacker actual
- ID: vf-20261120-hacker-01.
- Base: ZIP Distribucion/VtuberFriends-Windows-x64.zip entregado antes de añadir Hacker.
- Reemplaza exactamente VtuberFriends.dll y wwwroot/vfx/cinematic.js. La DLL solo añade hacker a la validación de animaciones; el módulo registra/dibuja el efecto.
- Mantiene las selecciones actuales. Hacker aparece como opción; se elige manualmente.
- No cambia puertos, rutas, número de fuentes, avatares, posiciones ni escenas de Streamlabs.
- Aplicador: src/VtuberFriends.Patch. Generador: scripts/make-patch.py.
- Pruebas: python tests/patch-probe.py y python tests/patch-settings-probe.py. Evidencia de las siete configuraciones: artifacts/patch-settings-audit.json.
- Verificado: ajustes completos iguales al arrancar después del parche, archivos privados iguales, URLs conservadas, solo cambia entryAnimation al elegir Hacker, y la versión anterior lee los mismos ajustes tras restaurar. Pruebas sintéticas; no se modificó la instalación real del streamer.

## Pruebas parametrizadas y modo prueba
Los probes de parches admiten --patch <id>, --base-patch <id-opcional> y --feature test-mode. Siempre extraen el ZIP original limpio y aplican, si procede, el delta anterior. Para el modo prueba se comprueba que activar/desactivar no guarda ni cambia ajustes, y que la presencia vuelve a depender de Discord.
Ejemplo: python tests/patch-settings-probe.py --patch vf-20261120-test-mode-02 --base-patch vf-20261120-hacker-01 --feature test-mode. Ejecutar también patch-probe.py con los mismos argumentos. La variante test-mode-base-02 usa el ZIP original sin --base-patch. Conservar cada baseline/delta y entregar solo la variante correspondiente al destinatario.

## Ampliación autorizada de fuentes
Para agregar una fuente se permite únicamente añadir su fila vacía/desactivada; conservar por igualdad completa todas las filas previas. No reescribir configuración al arrancar. Probar asignación/persistencia de la nueva fuente, URLs y límites, modo prueba y perfiles. Usar --feature sources-8 en ambos probes para el salto7a8 y --previous-max-slots7en make-patch.py. El aplicador/restaurador conserva el archivo; si ya se guardaron más fuentes que admite la versión anterior, bloquear la restauración, nunca truncar filas. No es válido declarar una restauración compatible que deje una configuración imposible de leer.
Las variantes03 desde original/Hacker01/modo prueba02 se verificaron con siete fuentes configuradas y nueva octava persistente; sus archivos privados y escenas externas simuladas permanecen intactos durante la aplicación.

## Audio05
Base acumulativa vf-20261121-audio-base-05 desde ZIP original; incremental vf-20261121-audio-05 desde cierre04. No intercambiarlas ni forzar hashes. Baseline cierre04 se reconstruye aplicando cierre-base-04 sobre ZIP original en carpeta temporal limpia. Configuración/token/sonidos/fuentes no forman parte del delta. Pruebas: ambos probes con sources-8 para base05 y close para incremental con --base-patch vf-20261120-cierre-base-04; RecoveryProbe valida supervisión sin iniciar Discord real. La llamada prolongada real debe validarse aparte.

## GitHub Releases desde0.6.0
Ver UPDATES.md. La primera instalación del actualizador requiere un último parche. Mantener asset por hash base exacto; nunca usar una instalación personal como baseline. Nuevas auras detectadas en el catálogo se registran en addedAccessoryValues: restaurar exige quitarlas también de perfiles inactivos. Runtime/dependencias incompatibles bloquean el delta. No publicar credenciales ni sonidos propios.
