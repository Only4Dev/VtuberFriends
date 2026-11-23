# Rendimiento y distribución — 2026-11-20

Se analizaron el transporte de estado, trabajo periódico en disco, carga de accesorios, DOM del panel y autoencuadre. No se midió la GPU de Streamlabs ni una llamada real en esta iteración.

## Hallazgos y cambios
- Antes: panel a20peticiones/s y cada fuente a~30peticiones/s de /api/state completo. Con panel+7fuentes: ~230peticiones/s, incluyendo todos los perfiles y ajustes. Ahora:8WebSockets y una captura/serialización compartida a30Hz; niveles compactos, ajustes al cambiar y diagnóstico1Hz. Colas limitadas a1fotograma evitan acumular retraso en clientes lentos. Al ocultar el panel se desconecta su flujo.
- Antes: la biblioteca de sonidos recorría archivos cada5s y también al reproducir. Ahora: se carga al abrir el panel y con Actualizar biblioteca; la reproducción usa el índice en memoria. No hay temporizador de sonidos.
- Antes: /api/ui-version se consultaba cada2s por ventana y el servidor volvía a calcular hashes de recursos cada segundo. Ahora: FileSystemWatcher invalida el hash solo por cambios; el flujo avisa de nueva versión y el navegador confirma estabilidad bajo demanda antes de recargar.
- Antes: cada rig decodificaba y subía todas las texturas de accesorios. Ahora: carga diferida al seleccionar y reutilización entre las manos; los efectos procedurales usan un texel compartido. Desactivar previews libera sus recursos de GPU.
- Antes: autoencuadre proyectaba toda la malla, incluso cuando se volvía a pedir en una misma pose. Ahora: cache por pose y extremos analíticos de columnas cuadráticas (75proyecciones frente625en malla24x24); Jade serpentino conserva el muestreo completo. Los extremos continuos son conservadores para no recortar la malla.
- El panel evita reconstruir controles si los ajustes no cambian y actualiza diagnóstico al llegar nuevos datos; niveles y animación conservan su cadencia independiente.

## Resultados confirmados
- Demo sintética con2usuarios y8clientes simultáneos:30Hz, aproximadamente77–83KB/s de JSON de niveles. El patrón anterior, con el estado medido de18,3KB, equivale a~4,2MB/s de JSON estimados. Es una reducción aproximada del98% del tráfico de ese escenario; no es una medida del98% de CPU/GPU.
-160poses extremas de8Puppets verificadas contra TODOS los vértices de sus mallas, incluyendo efectos y glows: sin recortes. El tiempo de la validación completa incluye assertions y no debe presentarse como benchmark directo frente al código optimizado.
-8clientes reciben cambios de configuración, desconexión/reentrada del transporte y cierre del servidor sin colas crecientes. Cierre medido~50–100ms en la demo.
-Executable self-contained probado desde la distribución con DOTNET_ROOT apuntando a una carpeta sin SDK/runtime: doctor nativo correcto, arranque sin credenciales, interfaz/configuración servida, guardado de IDs sintéticos sin iniciar sesión, desconexión y cierre.
-TokenVault probado con secreto sintético; DPAPI CurrentUser y compatibilidad bidireccional con Windows PowerShell. No se leyó ni modificó el token personal durante las pruebas.

Pruebas reproducibles: tests/runtime-performance-probe.mjs, tests/framing-performance-probe.mjs, tests/package-startup-probe.mjs, tests/state-stream-probe.mjs, tests/LevelsProbe y scripts/gui-smoke.ps1. Los JSON medidos están en artifacts.

## Pendiente de medición real
GPU/VRAM y fluidez visual con los modelos/efectos concretos de tu escena, audio y reconfiguración reales de Discord, y aceptación DAVE con dos usuarios simultáneos. Auras/glows/fuentes HD siguen teniendo coste real de GPU; el modo rendimiento del panel y800x600son opciones para equipos más modestos.

## Paquete limpio
Distribucion/VtuberFriends contiene el ejecutable, runtime/DLL, recursos usados por los rigs, accesorios y Sonidos. Se excluyeron271archivos del publish de desarrollo: PDB, scripts, configuración privada, notas de generación, texturas antiguas no referenciadas y otros artefactos. No se borró ningún archivo del proyecto original. Tamaño~245MB decimal antes de comprimir.

El amigo configura su propio bot/servidor/canal desde Configuración. Los ajustes personales del desarrollador aún no se han convertido en defaults; ese paso se hará cuando estén listos.
