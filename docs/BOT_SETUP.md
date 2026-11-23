# Crear y probar el bot de Discord

## Crear e invitar
1. Abre https://discord.com/developers/applications y pulsa **New Application**. Ponle Vtuber&Friends.
2. En **Bot**, crea el bot si aparece esa opción; en aplicaciones nuevas normalmente ya existe. Pulsa **Reset Token** para obtener el token. Guárdalo temporalmente en un gestor de contraseñas; nunca lo pegues en el chat ni en archivos del proyecto.
3. Deja los **Privileged Gateway Intents** desactivados. Esta app usa Guilds y GuildVoiceStates, que no son privilegiados.
4. En **OAuth2 → URL Generator**, marca el scope **bot** y los permisos **View Channels** y **Connect**. No requiere Administrator. Abre la URL generada e invita el bot al servidor de prueba con una cuenta que pueda administrar el servidor.
5. Comprueba que el canal de voz permite View Channel y Connect al rol del bot. Utiliza un canal normal de voz, no Stage ni llamada privada.
6. En Discord activa **Ajustes → Avanzado → Modo desarrollador**. Clic derecho sobre el servidor → **Copiar ID del servidor**. Clic derecho sobre el canal de voz → **Copiar ID del canal**.

## Configurar y arrancar
En PowerShell, desde la carpeta del proyecto:
```powershell
Set-Location -LiteralPath 'C:\Dev\VtuberFriends'
# Solo si config.json todavía no existe:
if (-not (Test-Path ./config.json)) { Copy-Item ./config.example.json ./config.json }
notepad ./config.json
```
Reemplaza los textos de guildId y channelId por los IDs, manteniendo las comillas.
Ejecuta:
```powershell
./scripts/run.ps1
```
La primera vez pedira el token: pegalo sin comillas y pulsa Enter. Lo guarda cifrado con DPAPI en `.local/bot-token.dpapi`, ligado a tu usuario de Windows en este equipo. En los siguientes inicios se carga automaticamente aunque cierres PowerShell. No se guarda en config.json ni se incluye en Git o en publish. Si ya existe VF_DISCORD_BOT_TOKEN en el entorno y no hay credencial guardada, se guarda cifrada automaticamente.

Para sustituir un token revocado:
```powershell
./scripts/run.ps1 -ResetToken
```
El bot se conecta automaticamente al canal configurado; no hay comando /join. Cierra la app con Ctrl+C. En otro equipo o usuario deberas introducir el token una vez de nuevo. Para la version portable usa tambien `scripts/run.ps1`, que inicia el ejecutable sin necesitar SDK.
## Probar con dos personas y Streamlabs
1. Dos personas entran al canal desde Discord habitual, sin instalar la app.
2. En el panel http://127.0.0.1:17861/ deben aparecer sus nombres en En tu mesa.
3. Asigna un invitado a la Fuente 1 y el otro a la Fuente 2; activa Mostrar en ambas. Ajusta opacidad y sensibilidad desde sus tarjetas.
4. Pulsa Copiar fuente en cada tarjeta y crea una Fuente de navegador independiente en Streamlabs, 400 x 300. Las URL son /overlay/1 y /overlay/2.
5. Las fuentes muestran solo avatar y nombre, con fondo transparente. Los ajustes cambian en directo y se conservan entre reinicios.
6. Prueba turnos, habla simultanea, silencio, mute, salida, reentrada y reconexion. Solo debe moverse el avatar de quien habla. Fuera del canal, debe ocultarse; desactivado Mostrar, tampoco debe aparecer.
7. Abre Estado de la conexion en el panel para comprobar DAVE/MLS y contadores. Una captura visual de dos avatares no basta para aprobar recepcion por usuario.
8. Deja una prueba de diez minutos y registra resultados en CURRENT.md.

El doctor demuestra carga nativa compatible; la demo demuestra panel y fuentes con usuarios sinteticos. La fuente de navegador no reproduce audio: configura la captura de Discord en Streamlabs para oir la llamada.

Fuentes: https://docs.discord.com/developers/quick-start/getting-started y https://docs.discord.com/developers/topics/oauth2