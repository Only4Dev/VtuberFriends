using System.Text.Json;
using VtuberFriends;

if (args.Contains("--doctor"))
{
    NativeAudio.Load();
    return;
}
bool demo = args.Contains("--demo");
int configIndex = Array.IndexOf(args, "--config");
string configPath = configIndex >= 0 && configIndex + 1 < args.Length
    ? Path.GetFullPath(args[configIndex + 1], AppContext.BaseDirectory)
    : Path.Combine(AppContext.BaseDirectory, "config.json");
if(configIndex<0&&Path.GetFileName(Path.TrimEndingDirectorySeparator(AppContext.BaseDirectory))=="app")configPath=Path.GetFullPath(Path.Combine(AppContext.BaseDirectory,"..","config.json"));
Config config = demo || !File.Exists(configPath) ? new() : JsonSerializer.Deserialize<Config>(File.ReadAllText(configPath),new JsonSerializerOptions {PropertyNameCaseInsensitive=true})??new();
if(config.Port is <1024 or >65535)throw new ArgumentException("Puerto inválido.");
string dataDirectory = Path.Combine(Path.GetDirectoryName(configPath)!, ".local");
int dataIndex = Array.IndexOf(args, "--data-dir");
if (dataIndex >= 0) dataDirectory = Path.GetFullPath(args[dataIndex + 1], AppContext.BaseDirectory);
using var diagnosticLog = new DiagnosticLog(Path.Combine(dataDirectory, "logs"));
diagnosticLog.Record(demo ? "APP_START_DEMO" : "APP_START_DISCORD");
var diagnostics = new AudioDiagnostics(diagnosticLog);
if (!demo) NativeAudio.Load(diagnostics);
var builder = WebApplication.CreateBuilder(new WebApplicationOptions
{
    Args = [], ContentRootPath = AppContext.BaseDirectory,
    WebRootPath = Path.Combine(AppContext.BaseDirectory, "wwwroot")
});
builder.Logging.AddFilter("Microsoft.AspNetCore", LogLevel.Warning);
int port = config.Port;
int portIndex = Array.IndexOf(args, "--port");
if (demo && portIndex >= 0) port = int.Parse(args[portIndex + 1]);
if (port is < 1024 or > 65535) throw new ArgumentException("Puerto invalido.");
builder.WebHost.UseUrls($"http://127.0.0.1:{port}");
using var singleInstance=new Semaphore(1,1,@"Local\VtuberFriends-"+port,out bool firstInstance);
if(!firstInstance){if(!demo&&!args.Contains("--no-panel"))DesktopWindow.Open($"http://127.0.0.1:{port}/");return;}
var app = builder.Build();
var levels = new Levels();
var avatars = new AvatarStore(Path.Combine(dataDirectory, demo ? "demo-avatars.json" : "avatars.json"), Path.Combine(AppContext.BaseDirectory, "wwwroot", "accessories", "catalog.json"));
var sounds = new SoundStore(Path.Combine(dataDirectory, "sounds"), Path.Combine(demo ? dataDirectory : Path.GetDirectoryName(configPath)!, "Sonidos"));
using var uiAssets = new UiAssets(Path.Combine(AppContext.BaseDirectory, "wwwroot"));
using var demoStop = new CancellationTokenSource();
await using var connection=new ConnectionManager(configPath,Path.Combine(dataDirectory,"bot-token.dpapi"),levels,diagnosticLog,demo);
connection.SetInitial(config);
int testMode=0;
await using var feed=new LiveFeed(()=>new {testMode=Volatile.Read(ref testMode)==1,receiver=connection.LiveStatus,users=levels.Snapshot(),participants=demo?new[]{new Participant("demo-a","Only4",true),new Participant("demo-b","Streamer",true)}:connection.Participants},()=>connection.Status,avatars,()=>uiAssets.Version);
using var reports=new DiagnosticReport(Path.Combine(dataDirectory,"logs"),()=>DiagnosticReport.Project(connection.Status,connection.Supervision,feed.Health,levels.Snapshot(),connection.Participants.Length,avatars.Snapshot().Count(s=>s.Enabled),Volatile.Read(ref testMode)==1),diagnosticLog);
using var feedStopping=app.Lifetime.ApplicationStopping.Register(feed.Stop);
using var connectingStopping=app.Lifetime.ApplicationStopping.Register(connection.BeginShutdown);
app.UseWebSockets();
await using var panelLifetime=new PanelLifetime(app.Lifetime);
app.MapGet("/api/panel-lifetime",panelLifetime.Serve);
app.MapGet("/api/live",feed.Serve);
using var updateHttp=new HttpClient{Timeout=TimeSpan.FromSeconds(90)};
var updates=new UpdateService(AppContext.BaseDirectory,updateHttp);
app.MapGet("/api/updates",()=>Results.Ok(updates.Status));
app.MapPost("/api/updates/check",async(HttpContext c)=>!PanelRequest(c)?Results.StatusCode(403):Results.Ok(await updates.Check(c.RequestAborted)));
app.MapPost("/api/updates/download",async(HttpContext c)=>!PanelRequest(c)?Results.StatusCode(403):Results.Ok(await updates.Download(c.RequestAborted)));
app.MapPost("/api/updates/install",(HttpContext c)=>{if(!PanelRequest(c))return Results.StatusCode(403);if(!updates.Install())return Results.BadRequest(new{error="Descarga primero un parche compatible."});app.Lifetime.StopApplication();return Results.Ok();});
app.MapGet("/api/settings",()=>Results.Ok(connection.Settings));
var setupWizard=new SetupWizard(Path.Combine(dataDirectory,"setup-wizard.json"));
app.MapGet("/api/setup-wizard",()=>Results.Ok(setupWizard.Describe(!connection.HasSetup&&avatars.Snapshot().Length==0,demo)));
app.MapPut("/api/setup-wizard",(WizardRequest value,HttpContext c)=>{
 if(!PanelRequest(c))return Results.StatusCode(403);
 try{setupWizard.Save(value.Outcome);return Results.Ok(new{saved=true});}
 catch(ArgumentException){return Results.BadRequest(new{error="Invalid wizard outcome."});}
 catch(IOException){return Results.Problem("Could not save setup preference.");}
});
bool PanelRequest(HttpContext c)=>c.Request.Headers["X-VF-Panel"]=="1"&&(c.Request.Headers.Origin.Count==0||c.Request.Headers.Origin.ToString()==$"http://127.0.0.1:{port}");
app.MapGet("/api/diagnostics/status",()=>Results.Ok(reports.Status));
app.MapPost("/api/diagnostics/export",(ReportContext value,HttpContext c)=>{
 if(!PanelRequest(c))return Results.StatusCode(403);
 try{return Results.File(reports.Export(value),"application/json",$"VtuberFriends-diagnostic-{DateTimeOffset.UtcNow:yyyyMMdd-HHmmss}.json");}
 catch{return Results.Problem("No se pudo crear el informe.");}
});
app.MapPost("/api/diagnostics/source",(SourceDiagnostic value,HttpContext c)=>{
 if(!PanelRequest(c))return Results.StatusCode(403);
 try{reports.Source(value,avatars.Snapshot().Select(s=>s.Id).ToHashSet());return Results.NoContent();}
 catch(ArgumentException){return Results.BadRequest();}
});
app.MapPut("/api/test-mode",(TestModeRequest request,HttpContext c)=>{
 if(!PanelRequest(c))return Results.StatusCode(403);
 Interlocked.Exchange(ref testMode,request.Enabled?1:0);return Results.Ok(new{enabled=Volatile.Read(ref testMode)==1});
});
app.MapPost("/api/settings/connect",async(ConnectionSettings value,HttpContext c)=>{
 if(!PanelRequest(c))return Results.StatusCode(403);
 try{reports.Capture("before_connect");await connection.SaveAndConnect(value);reports.Capture("after_connect");return Results.Ok(new{settings=connection.Settings,receiver=connection.Status});}
 catch(ArgumentException e){return Results.BadRequest(new{error=e.Message});}
 catch{return Results.Problem("No se pudieron guardar los datos de conexión.");}
});
app.MapPost("/api/audio/reconnect",async(HttpContext c)=>{
 if(!PanelRequest(c))return Results.StatusCode(403);
 try{reports.Capture("before_reconnect");await connection.ReconnectAudio();reports.Capture("after_reconnect");return Results.Ok(new{receiver=connection.Status});}
 catch(ArgumentException e){return Results.BadRequest(new{error=e.Message});}
});
app.MapPost("/api/settings/disconnect",async(HttpContext c)=>{if(!PanelRequest(c))return Results.StatusCode(403);await connection.Disconnect();return Results.Ok();});
app.MapPost("/api/app/exit",(HttpContext c)=>{if(!PanelRequest(c))return Results.StatusCode(403);app.Lifetime.StopApplication();return Results.Ok();});
app.Use(async (context, next) =>
{
    // Restrict loopback hostnames, including protection against DNS rebinding.
    if (context.Request.Host.Host != "127.0.0.1") { context.Response.StatusCode = 403; return; }
    context.Response.Headers.CacheControl = "no-store";
    await next();
});
app.Use(async (context, next) =>
{
    if (context.Request.Path == "/" && (context.Request.Query.ContainsKey("user") || context.Request.Query["clean"] == "1"))
    {
                string requestedUser = context.Request.Query["user"].ToString();
        var source = avatars.Snapshot().FirstOrDefault(slot => slot.UserId == requestedUser);
        context.Response.Redirect(source is null ? "/source.html" : $"/overlay/{source.Id}");
        return;
    }
    await next();
});
app.Use(async (context, next) =>
{
    string requestPath = context.Request.Path.Value ?? "/";
    if (requestPath == "/") requestPath = "/index.html";
    if (Path.GetExtension(requestPath) is ".html" or ".js" or ".css")
    {
        string webRoot = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "wwwroot")) + Path.DirectorySeparatorChar;
        string file = Path.GetFullPath(Path.Combine(webRoot, requestPath.TrimStart('/')));
        if (file.StartsWith(webRoot, StringComparison.OrdinalIgnoreCase) && File.Exists(file))
        {
            context.Response.ContentType = Path.GetExtension(file) switch
            {
                ".js" => "text/javascript; charset=utf-8", ".css" => "text/css; charset=utf-8", _ => "text/html; charset=utf-8"
            };
            await context.Response.WriteAsync(uiAssets.Render(file));
            return;
        }
    }
    await next();
});
app.MapGet("/api/ui-version", () => Results.Json(new { version = uiAssets.Version }));
app.UseDefaultFiles();
app.UseStaticFiles();
app.MapGet("/api/state", () => Results.Json(new
{
    testMode = Volatile.Read(ref testMode)==1,
    receiver = connection.Status,
    uiVersion = uiAssets.Version,
    users = levels.Snapshot(),
    participants = demo ? new[]{new Participant("demo-a", "Only4", true), new Participant("demo-b", "Streamer", true)} : connection.Participants,
    slots = avatars.Snapshot()
}));
app.MapPost("/api/slots",(HttpContext c)=>{if(!PanelRequest(c))return Results.StatusCode(403);try{return Results.Ok(avatars.Add());}catch(ArgumentException e){return Results.BadRequest(new{error=e.Message});}catch(IOException){return Results.Problem("No se pudo agregar la fuente.");}});
app.MapDelete("/api/slots/{id:int}",(int id,HttpContext c)=>{if(!PanelRequest(c))return Results.StatusCode(403);try{avatars.Remove(id);return Results.NoContent();}catch(ArgumentException e){return Results.BadRequest(new{error=e.Message});}catch(IOException){return Results.Problem("No se pudo eliminar la fuente.");}});
app.MapPut("/api/slots/{id:int}", (int id, AvatarSlot slot, HttpContext context) =>
{
    if (context.Request.Headers["X-VF-Panel"] != "1") return Results.StatusCode(403);
    string origin = context.Request.Headers.Origin.ToString();
    if (origin.Length > 0 && origin != $"http://127.0.0.1:{port}") return Results.StatusCode(403);
    try { return Results.Ok(avatars.Save(id, slot)); }
    catch (ArgumentException error) { return Results.BadRequest(new { error = error.Message }); }
    catch (IOException) { return Results.Problem("No se pudieron guardar los ajustes."); }
});
app.MapPost("/api/source-events/{id:int}/{kind}", (int id, string kind, HttpContext context) => {
    if (context.Request.Headers["X-VF-Panel"] != "1" || !AvatarStore.IsValidSlotId(id)) return Results.StatusCode(403);
    string origin = context.Request.Headers.Origin.ToString();
    if (origin.Length > 0 && origin != $"http://127.0.0.1:{port}") return Results.StatusCode(403);
    if (kind is not ("entry" or "exit" or "resume" or "load")) return Results.BadRequest();
    diagnosticLog.Record($"SOURCE_{id}_{kind.ToUpperInvariant()}");return Results.NoContent();
});
app.MapGet("/api/sounds", () => Results.Ok(sounds.List()));
app.MapPost("/api/sounds", async (HttpContext context) =>
{
    if (context.Request.Headers["X-VF-Panel"] != "1") return Results.StatusCode(403);
    string origin = context.Request.Headers.Origin.ToString();
    if (origin.Length > 0 && origin != $"http://127.0.0.1:{port}") return Results.StatusCode(403);
    if (context.Request.ContentLength is null || context.Request.ContentLength > SoundStore.MaxBytes + 1024 * 1024)
        return Results.BadRequest(new { error = "El archivo debe ser de hasta 10 MB." });
    if (!context.Request.HasFormContentType) return Results.BadRequest(new { error = "Selecciona un archivo de audio." });
    try
    {
        var form = await context.Request.ReadFormAsync(context.RequestAborted);
        if (form.Files.Count != 1) return Results.BadRequest(new { error = "Selecciona un solo sonido." });
        return Results.Ok(await sounds.SaveAsync(form.Files[0], context.RequestAborted));
    }
    catch (ArgumentException error) { return Results.BadRequest(new { error = error.Message }); }
    catch (InvalidDataException) { return Results.BadRequest(new { error = "Archivo demasiado grande o invalido." }); }
});
app.MapGet("/media/default-{direction}.wav", (string direction) =>
    direction is "entry" or "exit" ? Results.File(SoundStore.Builtin(direction == "entry"), "audio/wav") : Results.NotFound());
app.MapGet("/media/sounds/{id}", (string id) =>
{
    var sound = sounds.Find(id);
    return sound is { } file ? Results.File(file.Path, file.Mime, enableRangeProcessing: true) : Results.NotFound();
});
app.MapGet("/overlay/{id:int}", async (int id, HttpContext context) =>
{
    if (!AvatarStore.IsValidSlotId(id)) { context.Response.StatusCode = 404; return; }
    context.Response.ContentType = "text/html; charset=utf-8";
    await context.Response.WriteAsync(uiAssets.Render(Path.Combine(AppContext.BaseDirectory, "wwwroot", "source.html")));
});
Task? demoTask = null;
if (demo)
{
    demoTask = Task.Run(async () =>
    {
        int tick = 0;
        while (!demoStop.IsCancellationRequested)
        {
            byte[] pcm = new byte[3840];
            short value = (short)(Math.Sin(tick * 0.1) * 9000);
            for (int i = 0; i < pcm.Length; i += 2)
                System.Buffers.Binary.BinaryPrimitives.WriteInt16LittleEndian(pcm.AsSpan(i), value);
            levels.Push(tick / 100 % 2 == 0 ? "demo-a" : "demo-b", pcm);
            tick++;
            await Task.Delay(20, demoStop.Token);
        }
    });
}
try
{
    await app.StartAsync();
    Console.WriteLine($"Panel: http://127.0.0.1:{port}/");
    feed.Start();
    reports.Start();
    if(!demo&&!args.Contains("--no-panel"))DesktopWindow.Open($"http://127.0.0.1:{port}/");
    var startup=connection.ConnectSaved();
    await app.WaitForShutdownAsync();
    await startup;

}
finally
{
    reports.Capture("shutdown");reports.Dispose();
    await demoStop.CancelAsync();
    if (demoTask is not null) { try { await demoTask; } catch (OperationCanceledException) { } }
    await app.StopAsync();
    diagnosticLog.Record("APP_STOP");
    diagnosticLog.Flush();
}
public sealed class Config
{
    public string GuildId { get; init; } = "";
    public string ChannelId { get; init; } = "";
    public int Port { get; init; } = 17861;
}

public sealed record TestModeRequest(bool Enabled);
