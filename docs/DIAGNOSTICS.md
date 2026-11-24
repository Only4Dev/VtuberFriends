# Guardar y compartir un informe (0.8.1)

Si dejan de moverse las bocas:
1. Antes de cerrar o reconectar, abre **Configuración → Guardar informe de diagnóstico** (también disponible en Estado de la conexión).
2. Indica si ocurre a todos, si Discord se ilumina en verde, si se mueve el medidor del panel y si se mueve la boca en Streamlabs. Puedes elegir No lo sé.
3. Pulsa **Marcar el fallo y descargar informe**. Comparte el JSON con el desarrollador por Discord o el medio que prefieras. No necesitas cuenta de GitHub y la app no sube nada.
4. Después puedes usar Reconectar audio. Si ya reiniciaste, guarda el informe igualmente: incluye el historial anterior que siga disponible.

La app guarda una muestra de salud cada15s en `.local/logs/diagnostic-health.jsonl`, independiente de las vistas previas/minimización. Rota4archivos de1MB; los logs categóricos anteriores conservan su rotación4×2MB. La exportación incluye hasta480muestras y600eventos recientes, versión/sesión/UTC y las observaciones elegidas. Solo estados y contadores: gateway/voz/DAVE, PCM, lectores, reintentos, supervisión y entrega a fuentes. Los intervalos no se usan para disparar reconexión por silencio.

Las fuentes envían un heartbeat por minuto y códigos limitados de errorJS o pérdida/restauración WebGL, sin mensajes ni URLs de error. No se recoge audio, token, nombres/IDs Discord, configuración ni rutas del equipo. El exportador vuelve a filtrar los registros en disco; no adjunta archivos privados. Tampoco lee/incluye capturas o contenido de la escena de Streamlabs.

El informe ayuda a diferenciar entrada Discord, lector, recuperación y frontend; no demuestra por sí solo la causa ni garantiza corregirla. Los logs locales antiguos de desarrollo no se pueden atribuir al equipo del amigo. La retención es limitada y no reconstruye retroactivamente salud que versiones anteriores no registraban.

---

# Avisos de Discord y log local

El total acumulado es la cantidad de avisos recibidos desde que arrancó el receptor. No equivale a esa cantidad de fallos de animación ni demuestra por sí solo un problema activo. El panel muestra tipos de aviso, actividad en los últimos60segundos, paquetes descartados y fallos nativos de descifrado.

- VOICE_OPCODE_*: la biblioteca no reconoció un mensaje del protocolo de voz; requiere revisar compatibilidad si se repite o coincide con problemas.
- DAVE_UNEXPECTED_TRANSITION: aviso de transición del cifrado; se investiga junto con reentradas y cortes, no se oculta ni se considera inocuo automáticamente.
- DAVE_DECRYPT_* / NATIVE_DECRYPT_FAILED: rechazo de audio cifrado; puede perderse ese paquete y afectar continuidad de voz o movimiento de boca.
- MALFORMED_FRAME: se descartó un frame de audio que no pudo procesarse.
- DAVE_MLS_REJECTED_USER: rechazo de miembros de la sesión de cifrado. La protección que detiene el bot tras rechazos repetidos se conserva.
- AUDIO_READER_ERROR: el lector de audio terminó con una excepción.

## Archivo persistente
Desde esta versión, los nuevos eventos se guardan bajo la carpeta de datos portable:

`.local/logs/discord-diagnostics.jsonl`

Los archivos rotados se llaman discord-diagnostics.1.jsonl, .2.jsonl y .3.jsonl. Se conserva un máximo de cuatro archivos de aproximadamente2MB cada uno. Se reutilizan esos nombres; no se archiva indefinidamente.

Cada línea contiene únicamente fecha/horaUTC, categoría y cantidad. El primer evento de cada tipo se escribe al momento; repeticiones se agrupan en lotes cada5segundos y se vacían al cerrar normalmente. Un cierre forzado puede perder el último lote pendiente. Para contar eventos, suma el campo count: contar líneas no da el total. APP_START_DISCORD/DEMO y APP_STOP delimitan sesiones.

El log no contiene tokens, claves DAVE, audio, mensajes de usuarios ni payloads nativos. No se sirve porHTTP. Está excluido deGit/publicación junto con .local. Si hay un problema de permisos/escritura, el panel y la consola lo indican sin detener el audio.

El agente puede leer estos archivos de tuPC aunque hayas cerrado la app. Los avisos anteriores a instalar el registro no pueden recuperarse si solo estaban en memoria. Reiniciar limpia el contador del panel, pero no borra el historial de estos archivos; tampoco corrige la causa de un fallo.

Para consultar manualmente desde la raíz del proyecto:
```powershell
Get-Content .\.local\logs\discord-diagnostics*.jsonl | ConvertFrom-Json |
    Group-Object category | ForEach-Object {
        [pscustomobject]@{ Tipo = $_.Name; Eventos = ($_.Group | Measure-Object count -Sum).Sum }
    }
```

## Animaciones de fuentes
Las fuentes registran SOURCE_1_LOAD, SOURCE_1_ENTRY, SOURCE_1_EXIT y SOURCE_1_RESUME (1..6) en el mismo historial rotativo. No incluyen nombres, IDs de Discord, audio ni URLs arbitrarias. LOAD identifica carga del documento; RESUME una recarga o recuperación sin nueva entrada animada. Varias fuentes pueden registrar eventos simultáneos. Las cantidades se agrupan igual que los otros eventos; no equivalen a avisos de audio ni incrementan su contador. No existe evidencia retroactiva de entradas anteriores a esta versión.
