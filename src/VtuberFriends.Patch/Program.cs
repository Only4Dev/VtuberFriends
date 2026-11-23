using System.Diagnostics;

using System.Runtime.InteropServices;

using System.Security.Cryptography;

using System.Text.Json;

using System.Text.RegularExpressions;

using System.Text;



bool quiet=args.Contains("--quiet");bool rollback=args.Contains("--rollback")||Path.GetFileName(Environment.ProcessPath??"").StartsWith("Restaurar",StringComparison.OrdinalIgnoreCase);

string root=Path.TrimEndingDirectorySeparator(Path.GetFullPath(AppContext.BaseDirectory));int rootIndex=Array.IndexOf(args,"--root");if(rootIndex>=0)root=Path.GetFullPath(args[rootIndex+1]);

try{

 string package=root;int packageIndex=Array.IndexOf(args,"--package-root");if(packageIndex>=0){package=Path.GetFullPath(args[packageIndex+1]);string prefix=Path.Combine(root,".updates","staged")+Path.DirectorySeparatorChar;if(!package.StartsWith(prefix,StringComparison.OrdinalIgnoreCase))throw new InvalidDataException("Paquete fuera de staging.");}

 int waitIndex=Array.IndexOf(args,"--wait-pid");if(waitIndex>=0){try{using var parent=Process.GetProcessById(int.Parse(args[waitIndex+1]));if(!parent.WaitForExit(30000))throw new InvalidOperationException("La app sigue abierta; no se instalará.");}catch(ArgumentException){} }

 var options=new JsonSerializerOptions(JsonSerializerDefaults.Web);string manifestPath=Safe(package,"_patch/manifest.json");

 var manifest=JsonSerializer.Deserialize<Manifest>(File.ReadAllText(manifestPath),options)??throw new InvalidDataException("Manifiesto vacío.");

 if(manifest.Format!=1||!Regex.IsMatch(manifest.Id,"^[-a-z0-9]{1,80}$")||manifest.Files.Length is <1 or >512)throw new InvalidDataException("Parche inválido.");

 if(!File.Exists(Path.Combine(root,"VtuberFriends.exe")))throw new InvalidOperationException("Extrae el parche dentro de la carpeta de VtuberFriends, junto a VtuberFriends.exe.");

 var names=new HashSet<string>(StringComparer.OrdinalIgnoreCase);

 foreach(var file in manifest.Files){CheckPath(file.Path);if(!names.Add(file.Path))throw new InvalidDataException("Ruta duplicada.");if(!ValidHash(file.After)||file.Before is not null&&!ValidHash(file.Before))throw new InvalidDataException("Hash inválido.");}

 foreach(var identity in manifest.Base){if(identity.Key is not ("VtuberFriends.deps.json" or "VtuberFriends.runtimeconfig.json"))throw new InvalidDataException("Identidad inválida.");if(!Matches(Path.Combine(root,identity.Key),identity.Value))throw new InvalidOperationException("Este parche corresponde a otra versión del programa.");}

 if(!args.Contains("--dry-run"))foreach(var process in Process.GetProcessesByName("VtuberFriends")){using(process){try{if(string.Equals(process.MainModule?.FileName,Path.Combine(root,"VtuberFriends.exe"),StringComparison.OrdinalIgnoreCase))throw new InvalidOperationException("Cierra VtuberFriends desde Configuración > Cerrar aplicación antes de aplicar/restaurar el parche.");}catch(System.ComponentModel.Win32Exception){throw new InvalidOperationException("No se pudo verificar que la aplicación esté cerrada.");}}}

 string backups=Safe(root,".updates/backups");

 if(rollback){

  string dataRoot=Path.GetFileName(root)=="app"?Path.GetDirectoryName(root)!:root;string settings=Safe(dataRoot,".local/avatars.json");

  if(manifest.PreviousMaxSlots is int previousMax&&File.Exists(settings)){

   using var stored=JsonDocument.Parse(File.ReadAllText(settings));

   if(stored.RootElement.ValueKind==JsonValueKind.Array&&stored.RootElement.GetArrayLength()>previousMax)throw new InvalidOperationException($"Tus ajustes ya contienen {stored.RootElement.GetArrayLength()} fuentes. La versión anterior solo admite {previousMax}; no se restaurará ni se eliminarán fuentes. Conserva la versión actual.");

  }

  if(manifest.AddedAccessoryValues is {Count:>0}&&File.Exists(settings)){
   using var stored=JsonDocument.Parse(File.ReadAllText(settings));
   bool UsesAccessory(JsonElement item){if(item.ValueKind==JsonValueKind.Object){foreach(var prop in item.EnumerateObject()){if(manifest.AddedAccessoryValues.TryGetValue(prop.Name,out var values)&&prop.Value.ValueKind==JsonValueKind.String&&values.Contains(prop.Value.GetString()))return true;if(UsesAccessory(prop.Value))return true;}}else if(item.ValueKind==JsonValueKind.Array)foreach(var child in item.EnumerateArray())if(UsesAccessory(child))return true;return false;}
   if(UsesAccessory(stored.RootElement))throw new InvalidOperationException("Antes de restaurar, quita las auras nuevas de todas las fuentes y perfiles. No se cambiarán tus ajustes.");
  }
  if(manifest.AddedAnimations?.Length>0&&File.Exists(settings)){

   using var json=JsonDocument.Parse(File.ReadAllText(settings));

   bool UsesAdded(JsonElement item){if(item.ValueKind==JsonValueKind.Object){foreach(var property in item.EnumerateObject()){if(property.Name is "entryAnimation" or "exitAnimation"&&property.Value.ValueKind==JsonValueKind.String&&manifest.AddedAnimations.Contains(property.Value.GetString()))return true;if(UsesAdded(property.Value))return true;}}else if(item.ValueKind==JsonValueKind.Array){foreach(var child in item.EnumerateArray())if(UsesAdded(child))return true;}return false;}

   if(UsesAdded(json.RootElement))throw new InvalidOperationException("Antes de restaurar, cambia las animaciones nuevas (Hacker) a Pop en todas las fuentes y vuelve a cerrar la aplicación. Así la versión anterior podrá leer tus ajustes sin modificarlos.");

  }

  var folder=Directory.Exists(backups)?Directory.EnumerateDirectories(backups,manifest.Id+"-*").OrderDescending(StringComparer.Ordinal).FirstOrDefault(d=>File.Exists(Path.Combine(d,"complete"))&&!File.Exists(Path.Combine(d,"restored"))):null;

  if(folder is null)throw new InvalidOperationException("No hay copia de respaldo de este parche para restaurar.");

  foreach(var file in manifest.Files){if(!Matches(Safe(root,file.Path),file.After))throw new InvalidOperationException("Los archivos cambiaron después del parche. No se restaurará encima de otra versión.");if(file.Before is not null&&!Matches(Safe(Path.Combine(folder,"old"),file.Path),file.Before))throw new InvalidDataException("Respaldo incompleto.");}

  if(!args.Contains("--dry-run")){foreach(var file in manifest.Files.Reverse())Restore(file,folder);File.WriteAllText(Path.Combine(folder,"restored"),"ok");}

  Notify("Versión anterior restaurada. Tus ajustes se conservan.");return 0;

 }

 if(manifest.Files.All(f=>Matches(Safe(root,f.Path),f.After))){Notify("Este parche ya está instalado.");return 0;}

 foreach(var file in manifest.Files){string target=Safe(root,file.Path),payload=Safe(Path.Combine(package,"_patch","payload"),file.Path);if(!Matches(payload,file.After))throw new InvalidDataException("Parche incompleto o alterado: "+file.Path);if(file.Before is null?File.Exists(target):!Matches(target,file.Before))throw new InvalidOperationException("La versión no coincide o ese archivo fue modificado: "+file.Path);}

 if(args.Contains("--dry-run")){Notify("Parche compatible. Ningún archivo modificado.");return 0;}

 string backup=Path.Combine(backups,manifest.Id+"-"+DateTime.UtcNow.ToString("yyyyMMddHHmmssfff")+"-"+Guid.NewGuid().ToString("N")[..6]);Directory.CreateDirectory(backup);

 foreach(var file in manifest.Files){string stage=Safe(Path.Combine(backup,"new"),file.Path);Directory.CreateDirectory(Path.GetDirectoryName(stage)!);File.Copy(Safe(Path.Combine(package,"_patch","payload"),file.Path),stage);if(file.Before is not null){string old=Safe(Path.Combine(backup,"old"),file.Path);Directory.CreateDirectory(Path.GetDirectoryName(old)!);File.Copy(Safe(root,file.Path),old);}}

 File.Copy(manifestPath,Path.Combine(backup,"manifest.json"));var applied=new List<Change>();

 try{foreach(var file in manifest.Files){string target=Safe(root,file.Path);Directory.CreateDirectory(Path.GetDirectoryName(target)!);File.Move(Safe(Path.Combine(backup,"new"),file.Path),target,true);applied.Add(file);}File.WriteAllText(Path.Combine(backup,"complete"),"ok");}

 catch{foreach(var file in applied.AsEnumerable().Reverse())Restore(file,backup);throw;}

 if(args.Contains("--restart")){string start=Path.Combine(root,"VtuberFriends.exe");if(Path.GetFileName(root)=="app"&&File.Exists(Path.Combine(root,"..","VtuberFriends.exe")))start=Path.GetFullPath(Path.Combine(root,"..","VtuberFriends.exe"));Process.Start(new ProcessStartInfo(start){UseShellExecute=true});}

 Notify("Parche instalado: "+manifest.Title+". Abre VtuberFriends.exe. Tus ajustes, token y sonidos se conservan.");return 0;

 void Restore(Change file,string folder){string target=Safe(root,file.Path);if(file.Before is null){if(File.Exists(target))File.Delete(target);}else{string temporary=target+".restore-"+Guid.NewGuid().ToString("N");File.Copy(Safe(Path.Combine(folder,"old"),file.Path),temporary);File.Move(temporary,target,true);}}

}catch(Exception error){Notify("No se pudo completar el parche. "+error.Message,true);return 2;}

void Notify(string message,bool error=false){if(quiet)Console.WriteLine(message);else Native.MessageBox(IntPtr.Zero,message,"Vtuber & Friends · Parche",error?0x10u:0x40u);}

static bool ValidHash(string value)=>Regex.IsMatch(value,"^[a-fA-F0-9]{64}$");

static bool Matches(string path,string expected)=>File.Exists(path)&&Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(path))).Equals(expected,StringComparison.OrdinalIgnoreCase);

static void CheckPath(string path){

 if(path.Contains('\\')||path.Contains(':')||path.StartsWith('/')||path.Split('/').Any(p=>p is "" or "." or ".."))throw new InvalidDataException("Ruta inválida.");

 if(path is "VtuberFriends.dll" or "VtuberFriends.exe" or "VtuberFriends.deps.json" or "VtuberFriends.runtimeconfig.json")return;

 if(!path.StartsWith("wwwroot/",StringComparison.Ordinal)||Path.GetExtension(path).ToLowerInvariant() is not (".js" or ".css" or ".html" or ".svg" or ".png" or ".json" or ".woff2"))throw new InvalidDataException("El parche intenta modificar datos fuera de los recursos de la app.");

}

static string Safe(string root,string relative){string full=Path.GetFullPath(Path.Combine(root,relative)),prefix=Path.TrimEndingDirectorySeparator(Path.GetFullPath(root))+Path.DirectorySeparatorChar;if(!full.StartsWith(prefix,StringComparison.OrdinalIgnoreCase))throw new InvalidDataException("Ruta fuera de carpeta.");for(string? current=Path.GetDirectoryName(full);current is not null&&current.Length>=root.Length;current=Path.GetDirectoryName(current))if(Directory.Exists(current)&&(File.GetAttributes(current)&FileAttributes.ReparsePoint)!=0)throw new InvalidDataException("No se actualizan enlaces de carpetas.");if((File.Exists(full)||Directory.Exists(full))&&(File.GetAttributes(full)&FileAttributes.ReparsePoint)!=0)throw new InvalidDataException("No se actualizan enlaces.");return full;}

internal sealed record Change(string Path,string? Before,string After);

internal sealed record Manifest(int Format,string Id,string Title,Dictionary<string,string> Base,Change[] Files,string[]? AddedAnimations=null,int? PreviousMaxSlots=null,Dictionary<string,string[]>? AddedAccessoryValues=null);

internal static class Native{[DllImport("user32.dll",CharSet=CharSet.Unicode)]internal static extern int MessageBox(IntPtr window,string text,string caption,uint flags);}

