using System.Text.Json;
using System.Text.RegularExpressions;
namespace VtuberFriends;

// Deliberately accepts categories only. Never pass Discord messages or native payloads here.
public sealed class DiagnosticLog : IDisposable
{
    private readonly object gate = new();
    private readonly string directory;
    private readonly long maxBytes;
    private readonly Dictionary<string, int> pending = new();
    private readonly HashSet<string> seen = [];
    private readonly Timer timer;
    private bool disposed, writeFailed;
    private long writtenEvents;
    public DiagnosticLog(string directory, long maxBytes = 2 * 1024 * 1024)
    {
        this.directory = Path.GetFullPath(directory); this.maxBytes = Math.Max(256, maxBytes);
        timer = new Timer(_ => Flush(), null, 5000, 5000);
    }
    public object Status { get { lock (gate) return new { enabled = true, relativePath = "logs/discord-diagnostics.jsonl", writeFailed, writtenEvents }; } }
    public void Record(string category)
    {
        if (!Regex.IsMatch(category, "^[A-Z][A-Za-z0-9_:.-]{0,95}$")) throw new ArgumentException("Solo se permiten categorias de diagnostico.");
        lock (gate)
        {
            if (disposed) return;
            if (seen.Count >= 128 && !seen.Contains(category)) category = "LOG_CATEGORY_LIMIT";
            if (seen.Add(category)) Write(category, 1);
            else pending[category] = pending.GetValueOrDefault(category) + 1;
        }
    }
    public void Flush()
    {
        lock (gate)
        {
            if (disposed) return;
            foreach (var entry in pending) Write(entry.Key, entry.Value);
            pending.Clear();
        }
    }
    private void Write(string category, int count)
    {
        try
        {
            Directory.CreateDirectory(directory);
            string path = Path.Combine(directory, "discord-diagnostics.jsonl");
            if (File.Exists(path) && new FileInfo(path).Length >= maxBytes)
            {
                for (int i = 3; i >= 1; i--)
                {
                    string from = i == 1 ? path : Path.Combine(directory, $"discord-diagnostics.{i - 1}.jsonl");
                    string to = Path.Combine(directory, $"discord-diagnostics.{i}.jsonl");
                    if (File.Exists(from)) File.Move(from, to, true);
                }
            }
            File.AppendAllText(path, JsonSerializer.Serialize(new { utc = DateTimeOffset.UtcNow, category, count }) + Environment.NewLine);
            writtenEvents += count; writeFailed = false;
        }
        catch (Exception error) when (error is IOException or UnauthorizedAccessException)
        {
            if (!writeFailed) Console.WriteLine("No se pudo guardar el log local de diagnostico. Revisa permisos de la carpeta de datos.");
            writeFailed = true;
        }
    }
    public void Dispose()
    {
        timer.Dispose();
        lock (gate) { if (disposed) return; Flush(); disposed = true; }
    }
}
