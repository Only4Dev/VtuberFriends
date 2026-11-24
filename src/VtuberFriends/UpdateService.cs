using System.Diagnostics;
using System.IO.Compression;
using System.Security.Cryptography;
using System.Text.Json;
namespace VtuberFriends;

// Public GitHub Releases only. No account token is required or shipped to viewers.
public sealed class UpdateService(string root, HttpClient http)
{
 public const string Repository="Only4Dev/VtuberFriends";
 public const string Version="0.8.0";
 private readonly SemaphoreSlim gate=new(1);private JsonElement? selected;private string? staged;private int installing;
 private UpdateView status=new("idle",Version,Repository);
 public object Status=>Volatile.Read(ref status);
 private void Set(string state,string message)=>Volatile.Write(ref status,Volatile.Read(ref status) with {State=state,Message=message});
 public async Task<object> Check(CancellationToken ct=default){
  await gate.WaitAsync(ct);try{
   Volatile.Write(ref status,new("checking",Version,Repository,"Buscando actualizaciones…"));selected=null;
   using var request=new HttpRequestMessage(HttpMethod.Get,$"https://api.github.com/repos/{Repository}/releases/latest");request.Headers.UserAgent.ParseAdd("VtuberFriends/"+Version);request.Headers.Accept.ParseAdd("application/vnd.github+json");
   using var response=await http.SendAsync(request,HttpCompletionOption.ResponseHeadersRead,ct);
   if(response.StatusCode==System.Net.HttpStatusCode.NotFound){Set("current","Todavía no hay una versión publicada.");return Status;}
   response.EnsureSuccessStatusCode();byte[] body=await ReadBounded(await response.Content.ReadAsStreamAsync(ct),1024*1024,ct);using var doc=JsonDocument.Parse(body);var release=doc.RootElement;
   if(release.GetProperty("draft").GetBoolean()||release.GetProperty("prerelease").GetBoolean())throw new InvalidDataException();
   if(!System.Version.TryParse(release.GetProperty("tag_name").GetString()?.TrimStart('v'),out var latest)||latest<=System.Version.Parse(Version)){Set("current","Tienes la versión más reciente.");return Status;}
   string tag=release.GetProperty("tag_name").GetString()!;
   string changelog="https://github.com/"+Repository+"/releases/tag/"+Uri.EscapeDataString(tag);
   string notes=release.TryGetProperty("body",out var bodyText)?bodyText.GetString()??"":"";if(notes.Length>20000)notes=notes[..20000];
   Volatile.Write(ref status,Volatile.Read(ref status) with {LatestVersion=latest.ToString(),ChangelogUrl=changelog,Notes=notes});
   string fingerprint=Convert.ToHexStringLower(SHA256.HashData(await File.ReadAllBytesAsync(Path.Combine(root,"VtuberFriends.dll"),ct)))[..12];
   var asset=release.GetProperty("assets").EnumerateArray().FirstOrDefault(a=>a.GetProperty("name").GetString()==$"vf-update-{fingerprint}.zip");
   if(asset.ValueKind==JsonValueKind.Undefined){Set("incompatible","Hay una versión nueva, pero todavía no hay un parche compatible con esta instalación. Tus datos no se han cambiado.");return Status;}
   ValidateAsset(asset);selected=asset.Clone();Set("available","Nueva versión "+latest+" disponible. Puedes descargarla e instalarla cuando termines el directo.");return Status;
  }catch(OperationCanceledException){Set("error","Comprobación cancelada.");return Status;}catch{Set("error","No se pudo consultar GitHub. Puedes volver a intentarlo; la app sigue funcionando.");return Status;}finally{gate.Release();}
 }
 public static void ValidateAsset(JsonElement asset){
  var uri=new Uri(asset.GetProperty("browser_download_url").GetString()!);
  if(uri.Scheme!="https"||uri.Host!="github.com"||!uri.AbsolutePath.StartsWith("/"+Repository+"/releases/download/",StringComparison.Ordinal)||!string.IsNullOrEmpty(uri.UserInfo)||!string.IsNullOrEmpty(uri.Query)||asset.GetProperty("size").GetInt64() is <=0 or >100_000_000)throw new InvalidDataException("Recurso no permitido.");
  string digest=asset.GetProperty("digest").GetString()??"";if(!System.Text.RegularExpressions.Regex.IsMatch(digest,"^sha256:[a-f0-9]{64}$"))throw new InvalidDataException("Falta digest de GitHub.");
 }
 public async Task<object> Download(CancellationToken ct=default){
  await gate.WaitAsync(ct);try{
   if(selected is not JsonElement asset)throw new InvalidOperationException();ValidateAsset(asset);Set("downloading","Descargando y verificando el parche…");
   using var response=await http.GetAsync(asset.GetProperty("browser_download_url").GetString(),HttpCompletionOption.ResponseHeadersRead,ct);response.EnsureSuccessStatusCode();
   byte[] bytes=await ReadBounded(await response.Content.ReadAsStreamAsync(ct),100_000_000,ct);
   if(bytes.LongLength!=asset.GetProperty("size").GetInt64()||Convert.ToHexStringLower(SHA256.HashData(bytes))!=asset.GetProperty("digest").GetString()![7..])throw new InvalidDataException();
   string stageRoot=Path.Combine(root,".updates","staged");foreach(var folder in new[]{root,Path.Combine(root,".updates"),stageRoot})if(Directory.Exists(folder)&&(File.GetAttributes(folder)&FileAttributes.ReparsePoint)!=0)throw new InvalidDataException();
   string stage=Path.Combine(stageRoot,Guid.NewGuid().ToString("N"));Directory.CreateDirectory(stage);
   using(var zip=new ZipArchive(new MemoryStream(bytes))){if(zip.Entries.Count>1024)throw new InvalidDataException();long total=0;var names=new HashSet<string>(StringComparer.OrdinalIgnoreCase);foreach(var entry in zip.Entries){
    if(entry.FullName.EndsWith('/'))continue;
    if(!names.Add(entry.FullName)||entry.FullName.Contains('\\')||entry.FullName.Split('/').Any(p=>p is "" or "." or "..")||entry.FullName.Contains(':')||!AllowedEntry(entry.FullName)||(total+=entry.Length)>300_000_000)throw new InvalidDataException();
    string path=Path.Combine(stage,entry.FullName);Directory.CreateDirectory(Path.GetDirectoryName(path)!);await using var output=File.Create(path);await using var input=entry.Open();await input.CopyToAsync(output,ct);
   }}
   // The trusted installed helper validates every before/after hash, path and version before shutdown.
   var result=await RunHelper(stage,true,ct);if(result!=0)throw new InvalidDataException();staged=stage;Set("ready","Parche verificado. Instalar y reiniciar cierra la app brevemente; se conservan tus ajustes.");return Status;
  }catch{staged=null;Set("error","No se pudo verificar el parche o esta instalación fue modificada. No se ha cambiado ningún archivo del programa.");return Status;}finally{gate.Release();}
 }
 public static bool AllowedEntry(string path)=>path=="_patch/manifest.json"||path.StartsWith("_patch/payload/",StringComparison.Ordinal)&&!path.Split('/').Any(x=>x is ".local" or "Sonidos")||path is "LEEME-PARCHE.txt" or "Aplicar parche.exe" or "Restaurar parche.exe" or "VtuberFriends.Patch.dll" or "VtuberFriends.Patch.deps.json" or "VtuberFriends.Patch.runtimeconfig.json";
 private ProcessStartInfo Helper(string stage){var info=new ProcessStartInfo(Path.Combine(root,"Aplicar parche.exe")){UseShellExecute=false,CreateNoWindow=true,WorkingDirectory=root};foreach(var a in new[]{"--root",root,"--package-root",stage,"--quiet"})info.ArgumentList.Add(a);return info;}
 private async Task<int> RunHelper(string stage,bool dryRun,CancellationToken ct){var info=Helper(stage);if(dryRun)info.ArgumentList.Add("--dry-run");using var p=Process.Start(info)??throw new IOException();await p.WaitForExitAsync(ct).WaitAsync(TimeSpan.FromSeconds(30),ct);return p.ExitCode;}
 public bool Install(){if(staged is null||Interlocked.CompareExchange(ref installing,1,0)!=0)return false;var info=Helper(staged);info.ArgumentList.Add("--wait-pid");info.ArgumentList.Add(Environment.ProcessId.ToString());info.ArgumentList.Add("--restart");try{_ = Process.Start(info)??throw new IOException();}catch{Interlocked.Exchange(ref installing,0);Set("error","No se pudo iniciar el instalador. La app sigue abierta.");return false;}Set("installing","Cerrando para instalar…");return true;}
 private static async Task<byte[]> ReadBounded(Stream input,long maximum,CancellationToken ct){using var bytes=new MemoryStream();byte[] buffer=new byte[81920];int n;while((n=await input.ReadAsync(buffer,ct))>0){if(bytes.Length+n>maximum)throw new InvalidDataException();await bytes.WriteAsync(buffer.AsMemory(0,n),ct);}return bytes.ToArray();}
}

public sealed record UpdateView(string State,string Version,string Repository,string? Message=null,string? LatestVersion=null,string? ChangelogUrl=null,string? Notes=null);
