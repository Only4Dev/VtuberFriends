# Publicación y actualizaciones portables

Repositorio: https://github.com/Only4Dev/VtuberFriends

La app consulta Releases públicas de este repositorio. El streamer no necesita cuenta ni token de GitHub. La versión0.7.0 es la primera build funcional pública y baseline para futuras actualizaciones. Se distribuye un único ZIP completo de la app, sin parches de incorporación antiguos.

Para mantener el setup al descargar esta primera build, cerrar la app y extraer el ZIP completo EN LA MISMA carpeta, reemplazando archivos del programa, sin borrar previamente la carpeta. El paquete no incluye config.json ni .local ni sonidos personales. Se conservan los datos de raíz y las URLs de Streamlabs. En una carpeta nueva vacía no se encuentran los datos de la otra carpeta: hay que copiar config.json, .local y Sonidos. El token cifrado sigue siendo del mismo usuario Windows.

## Lo que se conserva

`config.json`, `.local` (token cifrado, avatares, perfiles, posiciones y logs), `Sonidos`, URLs de overlays y escenas de Streamlabs permanecen fuera de los archivos actualizables. La distribución nueva deja `VtuberFriends.exe` en la raíz y el runtime dentro de `app`. Los parches sobre instalaciones antiguas conservan su estructura; no mueven sus datos.

## Flujo del streamer

Al abrir el panel se comprueba una vez (activado por defecto). Un aviso visible muestra la nueva versión, Ver changelog y Actualizar. Actualizar descarga, verifica, instala y reinicia con un solo clic. También se puede comprobar manualmente desde Configuración. Puede buscar una vez al abrir el panel; no consulta en cada fotograma ni descarga en segundo plano durante el directo. La instalación requiere una acción del usuario y detiene brevemente el receptor.

La app selecciona únicamente el asset `vf-update-<primeros12delSHA256deDLLactual>.zip`. Comprueba origen HTTPS del repositorio, tamaño y digest SHA256 publicado por GitHub, límites del ZIP y rutas. El helper instalado verifica la totalidad de los hashes before/after, compatibilidad y rutas permitidas antes de cerrar. Espera la salida del proceso; crea respaldo y revierte si falla una copia. Nunca ejecuta un helper descargado dentro del ZIP.

Un archivo modificado manualmente o una versión sin delta compatible bloquea la instalación. No se fuerza. El modelo de confianza es la cuenta/repositorio de GitHub y TLS; no hay todavía firma independiente del editor ni Authenticode. Mantener protegida la cuenta del editor.

## Flujo del desarrollador

1. Cambiar `UpdateService.Version` a una versión superior. Implementar y validar; conservar el ZIP exacto anterior.
2. La plantilla `.github/workflow-templates/release.yml` está preparada, pero no activa: la credencial usada para la primera publicación carece del permiso workflow. Para activarla, copiarla a `.github/workflows/release.yml` con una credencial autorizada. Una vez instalada, publicar etiqueta `v<versión>` compila, prueba sin Discord real y genera la distribución limpia. Mientras tanto se compila localmente con scripts/publish.ps1 y se publica mediante scripts/github-publish.py; no se necesita Actions para que la app consulte Releases.
3. El workflow descarga la última release pública limpia, genera el delta y publica el ZIP completo y el asset compatible. La primera release no tiene baseline anterior. También puede ejecutarse manualmente para producir artifacts sin publicar.
4. Revisar manifiesto, hashes, cambios de esquema, nuevas animaciones y pruebas de conservación antes de etiquetar. Nuevos valores de accesorios se detectan del catálogo y bloquean una restauración incompatible; las animaciones nuevas deben declararse con `--animation` en el flujo de parches.
5. Una actualización de runtime/dependencias requiere preparar y probar una migración compatible completa. El generador rechaza hacerla pasar por un parche pequeño.

Para otras apps, reutilizar el contrato de manifiesto, helper transaccional y verificación por baseline; cambiar identidad, repositorio y lista permitida. No reutilizar rutas ni identificadores de VtuberFriends sin adaptarlos.

## Validación pendiente de uso real

Las pruebas locales usan HTTP simulado y configuraciones sintéticas. Una llamada prolongada real DAVE y la revisión visual en Streamlabs siguen siendo pruebas separadas.

Desde0.7.0, una instalación nueva inicia con0fuentes. Actualizar una instalación6/7/8conserva todas sus filas y URLs sin reescribir al arrancar. Altas/bajas reservan IDs y marcan el esquema dinámico; el restaurador bloquea volver a un esquema fijo tras usarlas. La GUI confirma bajas y crea backup local.
