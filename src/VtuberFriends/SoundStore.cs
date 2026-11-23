using Microsoft.AspNetCore.Http;
using System.Text;
using System.Text.RegularExpressions;
namespace VtuberFriends;

public sealed class SoundStore(string directory, string? libraryDirectory = null)
{
    public const long MaxBytes = 10 * 1024 * 1024;
    public static bool IsId(string value) => Regex.IsMatch(value, @"^[a-f0-9]{32}\.(wav|mp3|ogg|m4a|webm)$");
    private readonly object libraryLock = new();
    private Dictionary<string, string> library = new();
    private bool libraryLoaded;
    public object[] List(bool refresh = true)
    {
        lock (libraryLock)
        {
            if(!refresh && libraryLoaded) return library.Select(x => (object)new { soundId=x.Key,name=System.IO.Path.GetFileName(x.Value) }).ToArray();
            var next = new Dictionary<string, string>();
            if (libraryDirectory is not null)
            {
                Directory.CreateDirectory(libraryDirectory);
                if ((File.GetAttributes(libraryDirectory) & FileAttributes.ReparsePoint) != 0) throw new InvalidOperationException("Sonidos debe ser una carpeta local, no un enlace.");
                foreach (var path in Directory.EnumerateFiles(libraryDirectory).Order(StringComparer.OrdinalIgnoreCase).Take(500))
                {
                    try
                    {
                        var file = new FileInfo(path);
                        string ext = file.Extension.ToLowerInvariant();
                        if (file.Length is <= 0 or > MaxBytes || (file.Attributes & FileAttributes.ReparsePoint) != 0 || !Compatible(path, ext)) continue;
                        string hash = Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(Encoding.UTF8.GetBytes(file.Name.ToLowerInvariant())))[..32].ToLowerInvariant();
                        next[hash + ext] = path;
                    }
                    catch (IOException) { }
                    catch (UnauthorizedAccessException) { }
                }
            }
            library = next;libraryLoaded=true;
            return next.Select(x => (object)new { soundId = x.Key, name = System.IO.Path.GetFileName(x.Value) }).ToArray();
        }
    }
    private static bool Compatible(string path, string ext)
    {
        using var stream = File.OpenRead(path); byte[] h = new byte[12]; int n = stream.Read(h);
        return ext switch {
            ".wav" => n >= 12 && Encoding.ASCII.GetString(h, 0, 4) == "RIFF" && Encoding.ASCII.GetString(h, 8, 4) == "WAVE",
            ".mp3" => n >= 3 && (Encoding.ASCII.GetString(h, 0, 3) == "ID3" || h[0] == 255 && (h[1] & 224) == 224),
            ".ogg" => n >= 4 && Encoding.ASCII.GetString(h, 0, 4) == "OggS",
            ".m4a" => n >= 8 && Encoding.ASCII.GetString(h, 4, 4) == "ftyp",
            ".webm" => n >= 4 && h[0] == 0x1a && h[1] == 0x45 && h[2] == 0xdf && h[3] == 0xa3, _ => false };
    }
    public (string Path, string Mime)? Find(string id)
    {
        if (!IsId(id)) return null;
        string path = System.IO.Path.Combine(directory, id);
        if (File.Exists(path)) return (path, Mime(System.IO.Path.GetExtension(id)));
        List(false);
        lock (libraryLock)
        {
            if (!library.TryGetValue(id, out path!) || !File.Exists(path)) return null;
            return (path, Mime(System.IO.Path.GetExtension(id)));
        }
    }
    public async Task<object> SaveAsync(IFormFile file, CancellationToken cancellation)
    {
        string extension = System.IO.Path.GetExtension(file.FileName).ToLowerInvariant();
        if (file.Length is <= 0 or > MaxBytes || extension is not (".wav" or ".mp3" or ".ogg" or ".m4a" or ".webm"))
            throw new ArgumentException("Elige WAV, MP3, OGG, M4A o WEBM de hasta 10 MB.");
        await using var input = file.OpenReadStream();
        byte[] header = new byte[16];
        int length = await input.ReadAtLeastAsync(header, 12, false, cancellation);
        bool valid = extension switch
        {
            ".wav" => length >= 12 && Encoding.ASCII.GetString(header, 0, 4) == "RIFF" && Encoding.ASCII.GetString(header, 8, 4) == "WAVE",
            ".mp3" => length >= 3 && (Encoding.ASCII.GetString(header, 0, 3) == "ID3" || header[0] == 255 && (header[1] & 224) == 224),
            ".ogg" => length >= 4 && Encoding.ASCII.GetString(header, 0, 4) == "OggS",
            ".m4a" => length >= 8 && Encoding.ASCII.GetString(header, 4, 4) == "ftyp",
            ".webm" => length >= 4 && header[0] == 0x1a && header[1] == 0x45 && header[2] == 0xdf && header[3] == 0xa3,
            _ => false
        };
        if (!valid) throw new ArgumentException("El contenido no coincide con un archivo de audio compatible.");
        Directory.CreateDirectory(directory);
        string id = Guid.NewGuid().ToString("N") + extension;
        string path = System.IO.Path.Combine(directory, id);
        try
        {
            await using var output = new FileStream(path, FileMode.CreateNew, FileAccess.Write);
            await output.WriteAsync(header.AsMemory(0, length), cancellation);
            await input.CopyToAsync(output, cancellation);
        }
        catch { if (File.Exists(path)) File.Delete(path); throw; }
        string name = System.IO.Path.GetFileName(file.FileName.Replace('\\', '/'));
        if (name.Length > 120) name = name[..120];
        return new { soundId = id, name };
    }
    private static string Mime(string extension) => extension switch
    {
        ".wav" => "audio/wav", ".mp3" => "audio/mpeg", ".ogg" => "audio/ogg",
        ".m4a" => "audio/mp4", ".webm" => "audio/webm", _ => "application/octet-stream"
    };
    // Original soft pluck/bubble cues, synthesized locally: no external recordings.
    public static byte[] Builtin(bool entry)
    {
        const int rate = 44100;
        int samples = (int)(rate * (entry ? .3 : .24));
        using var stream = new MemoryStream();
        using var writer = new BinaryWriter(stream);
        writer.Write(Encoding.ASCII.GetBytes("RIFF")); writer.Write(36 + samples * 2);
        writer.Write(Encoding.ASCII.GetBytes("WAVEfmt ")); writer.Write(16);
        writer.Write((short)1); writer.Write((short)1); writer.Write(rate); writer.Write(rate * 2);
        writer.Write((short)2); writer.Write((short)16); writer.Write(Encoding.ASCII.GetBytes("data")); writer.Write(samples * 2);
        double phase = 0;
        for (int i = 0; i < samples; i++)
        {
            double t = i / (double)rate, progress = i / (double)samples;
            double frequency = entry ? 430 + 500 * (1 - Math.Exp(-t * 15)) : 760 * Math.Exp(-t * 10) + 160;
            phase += 2 * Math.PI * frequency / rate;
            double envelope = Math.Min(1, t / .008) * Math.Pow(1 - progress, 3);
            double sample = (.72 * Math.Sin(phase) + .18 * Math.Sin(phase * 2.01)) * envelope * .45;
            writer.Write((short)(sample * short.MaxValue));
        }
        return stream.ToArray();
    }
}
