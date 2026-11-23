using VtuberFriends;
var levels = new Levels();
byte[] loud = [0, 64, 0, 64]; // +0.5 signed PCM16 little endian
levels.Push("A", loud);
levels.Push("B", new byte[4]);
var state = levels.Snapshot();
if (state.Length != 2 || !state[0].Speaking || state[1].Speaking || state[0].Rms != 0.5)
    throw new Exception("Separación o RMS incorrectos.");
await Task.Delay(300);
if (levels.Snapshot().Any(x => x.Speaking)) throw new Exception("Avatar pegado al hablar.");
levels.Push("A", loud);
levels.SilenceAll();
if (levels.Snapshot().Any(x => x.Speaking)) throw new Exception("Desconexión no silencia.");
levels.Push("A", [1]);
if (levels.Snapshot()[0].Frames != 2) throw new Exception("PCM inválido aceptado.");
Console.WriteLine("PASS: usuarios independientes, RMS PCM16, silencio por timeout, desconexión y PCM inválido.");

DiagnosticsProbe.Run();

AvatarStoreProbe.Run();

string logs = Path.Combine(Path.GetTempPath(), "vf-log-" + Guid.NewGuid().ToString("N"));
try
{
    using (var history = new DiagnosticLog(logs, 256))
    {
        var observed = new AudioDiagnostics(history);
        for (int i = 0; i < 1000; i++) observed.RecordWarning("Unknown OpCode (15)");
        history.Flush();
        var rows = Directory.GetFiles(logs, "*.jsonl").SelectMany(File.ReadAllLines).Select(line => System.Text.Json.JsonDocument.Parse(line)).ToArray();
        if (rows.Sum(row => row.RootElement.GetProperty("count").GetInt32()) != 1000 || rows.Length > 3) throw new Exception("No agrupa avisos sin perder cantidades.");
        for (int i = 0; i < 20; i++) history.Record("TEST_ROTATION_" + i);
        try { history.Record("secret token with spaces"); throw new Exception("Acepto payload arbitrario."); } catch (ArgumentException) { }
    }
    if (Directory.GetFiles(logs).Length > 4) throw new Exception("Log sin limite de rotacion.");
    Console.WriteLine("PASS: log local persistente, agregacion, rotacion a cuatro archivos y rechazo de payloads.");
}
finally { Directory.Delete(logs, true); }

SoundLibraryProbe.Run();

if(OperatingSystem.IsWindows()){
 string vault=Path.Combine(Path.GetTempPath(),"vf-vault-"+Guid.NewGuid().ToString("N"),"fake.dpapi");
 try{TokenVault.Save(vault,"FAKE_TEST_SECRET");if(TokenVault.Read(vault)!="FAKE_TEST_SECRET"||File.ReadAllText(vault).Contains("FAKE_TEST_SECRET"))throw new Exception("DPAPI roundtrip failed.");Console.WriteLine("PASS: token sintetico cifrado con DPAPI CurrentUser, roundtrip y ausencia de texto plano.");}
 finally{if(File.Exists(vault))File.Delete(vault);Directory.Delete(Path.GetDirectoryName(vault)!);}
}

TokenVaultCompatibilityProbe.Run();

{
 var hanging=new TaskCompletionSource();bool boundedFailure=false;var elapsed=System.Diagnostics.Stopwatch.StartNew();
 await ShutdownTasks.TryAsync(()=>hanging.Task,TimeSpan.FromMilliseconds(30),()=>boundedFailure=true);
 if(!boundedFailure||elapsed.ElapsedMilliseconds>2500)throw new Exception("Shutdown did not bound hung cleanup.");hanging.TrySetResult();
 bool healthyFailure=false;await ShutdownTasks.TryAsync(()=>Task.CompletedTask,TimeSpan.FromSeconds(1),()=>healthyFailure=true);if(healthyFailure)throw new Exception("Healthy cleanup was marked failed.");
 Console.WriteLine("PASS: cierre acotado ante limpieza bloqueada y finalizacion normal sin errores.");
}
