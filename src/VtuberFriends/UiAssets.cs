using System.Security.Cryptography;
using System.Text;
namespace VtuberFriends;

public sealed class UiAssets(string root) : IDisposable
{
    private readonly object gate = new();
    private int dirty=1;
    private FileSystemWatcher? watcher;
    private string version = "";
    public string Version
    {
        get
        {
            lock (gate)
            {
                if(watcher is null){watcher=new FileSystemWatcher(root){IncludeSubdirectories=true,NotifyFilter=NotifyFilters.FileName|NotifyFilters.LastWrite|NotifyFilters.Size|NotifyFilters.DirectoryName};
                    watcher.Changed+=(_,_)=>Interlocked.Exchange(ref dirty,1);watcher.Created+=(_,_)=>Interlocked.Exchange(ref dirty,1);watcher.Deleted+=(_,_)=>Interlocked.Exchange(ref dirty,1);watcher.Renamed+=(_,_)=>Interlocked.Exchange(ref dirty,1);watcher.Error+=(_,_)=>Interlocked.Exchange(ref dirty,1);watcher.EnableRaisingEvents=true;}
                if(version.Length>0&&Volatile.Read(ref dirty)==0)return version;
                Interlocked.Exchange(ref dirty,0);
                using var hash = IncrementalHash.CreateHash(HashAlgorithmName.SHA256);
                foreach (var file in Directory.EnumerateFiles(root, "*", SearchOption.AllDirectories)
                    .Where(p => Path.GetExtension(p) is ".html" or ".js" or ".css" or ".svg" or ".json" or ".png").Order(StringComparer.Ordinal))
                {
                    hash.AppendData(Encoding.UTF8.GetBytes(Path.GetRelativePath(root, file)));
                    if (Path.GetExtension(file) == ".png")
                    {
                        var info = new FileInfo(file);
                        hash.AppendData(Encoding.UTF8.GetBytes(info.Length + ":" + info.LastWriteTimeUtc.Ticks));
                    }
                    else hash.AppendData(File.ReadAllBytes(file));
                }
                version = Convert.ToHexString(hash.GetHashAndReset())[..16].ToLowerInvariant();

                return version;
            }
        }
    }
    public void Dispose()=>watcher?.Dispose();
    public string Render(string file) => File.ReadAllText(file).Replace("__UI_VERSION__", Version, StringComparison.Ordinal);
}
