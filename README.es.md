# Vtuber & Friends

[English](README.md) | [Español](README.es.md)

Avatares 2D por capas que reaccionan a las voces de una llamada de Discord y se muestran en Streamlabs. **Solo el streamer instala la app.** Los invitados usan Discord normal.

**Windows x64 · Portable · Interfaz en español e inglés · Versión 0.7.0**

[Descargar la última versión](https://github.com/Only4Dev/VtuberFriends/releases/latest) · [Changelog](CHANGELOG.md)

## Empezar

1. Descarga **VtuberFriends-Windows-x64.zip** desde Releases y extrae todo el ZIP en una carpeta con permiso de escritura.
2. Abre **VtuberFriends.exe**. Conserva las carpetas `app` y `Sonidos` junto al ejecutable. La versión distribuible no necesita instalar .NET ni abrir PowerShell.
3. En **Configuración** introduce el token del bot, el ID del servidor y el del canal de voz; pulsa **Guardar y conectar**. Crea e invita un bot oficial desde [Discord Developer Portal](https://discord.com/developers/applications), con acceso para ver y conectar al canal de voz.
4. Pulsa **+ Agregar fuente**, elige un Puppet y asigna al invitado. También puedes prepararlo por su ID de Discord antes de que entre.
5. Activa **Mostrar**, copia la URL y agrégala como **Fuente de navegador** en Streamlabs. Usa **1440 × 1080** para HD u **800 × 600** para menor consumo.

Una instalación nueva empieza con **cero fuentes**. Actualizar conserva las fuentes, los ajustes y las URLs existentes. Puedes añadir hasta 64; eliminar pide confirmación y nunca renumera otra fuente ni reutiliza su URL.

## Personalizar

- Ocho Puppets por capas y cuatro avatares originales **Legacy**.
- Accesorios con posición, tamaño y giro por Puppet: agrégalos por categoría, selecciónalos en la vista previa y usa sus tiradores.
- Sensibilidad de voz y boca, gestos, mirada, alas, respiración y glow selectivo.
- Entradas/salidas, sonidos, auras, runas, humo y rayos.
- Etiquetas, opacidad, modo rendimiento y modo prueba para organizar las fuentes sin esperar a todos los invitados.
- Copia audios a **Sonidos** y actualiza la biblioteca cuando lo necesites; no se escanea continuamente.

## Actualizaciones

El panel busca nuevas Releases públicas al abrirse (activado por defecto). Si hay un parche compatible, muestra la versión, **Ver changelog** y **Actualizar**. Al actualizar descarga y verifica el parche, cierra el receptor, crea un respaldo, instala y reinicia la app.

Actualiza después del directo. Se conservan `config.json`, `.local`, token, sonidos, asignaciones y posiciones. El instalador comprueba la versión exacta y rechaza archivos incompatibles o modificados. Consulta [UPDATES.md](docs/UPDATES.md).

## Tus datos

`config.json`, `.local` y `Sonidos` están junto al ejecutable principal. Consérvalos al mover o respaldar tu instalación. El token se cifra para el usuario actual de Windows; en otro PC o usuario debes configurarlo de nuevo. Nunca publiques el token ni `.local` en GitHub.

La X del último panel detiene el receptor tras unos segundos. Minimizar mantiene el directo funcionando. Las fuentes del navegador no mantienen vivo el receptor después de cerrar su panel.

## Desarrollo

Necesitas el SDK .NET 10 indicado por `global.json`. Las bibliotecas nativas están fijadas en `native/win-x64`; no actualices libdave por separado de Discord.Net.

```powershell
.\scripts\run.ps1
```

DEV usa ajustes separados en `.local/dev`. Usa `-UseExistingData` solo si quieres abrir explícitamente la configuración local anterior. Para pruebas aisladas sin Discord usa `-Demo -NoPanel -DataDirectory <carpeta-temporal>`.

`scripts/publish.ps1` prepara la versión portable. Compilar el lanzador nativo requiere las herramientas C++ de Visual Studio. Las etiquetas de versión ejecutan el workflow de GitHub. Consulta [PATCH_WORKFLOW.md](docs/PATCH_WORKFLOW.md).

## Validación y límites

Las pruebas sintéticas cubren recuperación de audio, conservación de ajustes, fuentes, validación del actualizador e interfaz. No equivalen a una llamada DAVE real de varias horas ni a comprobar imagen/sonido en Streamlabs. Un rechazo MLS/DAVE bloquea reintentos automáticos; el silencio por sí solo nunca provoca una reconexión.

Las dependencias conservan sus licencias; ver `third-party/` y los avisos incluidos en la descarga.
