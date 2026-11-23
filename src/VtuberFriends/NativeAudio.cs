using System.Reflection;
using System.Runtime.InteropServices;
using Discord.Audio;
using Discord.LibDave;

namespace VtuberFriends;

public static class NativeAudio
{
    private static readonly Dictionary<string, nint> handles = new(StringComparer.OrdinalIgnoreCase);
    public static void SetDiagnostics(AudioDiagnostics? diagnostics)=>Dave.SetLogSink((severity,file,line,message)=>diagnostics?.ObserveNative(message));
    public static void Load(AudioDiagnostics? diagnostics = null)
    {
        if (!OperatingSystem.IsWindows() || RuntimeInformation.ProcessArchitecture != Architecture.X64)
            throw new PlatformNotSupportedException("Este primer prototipo requiere Windows x64.");
        foreach (var name in new[] { "opus", "libsodium", "libdave" })
        {
            string path = Path.Combine(AppContext.BaseDirectory, "native", "win-x64", name + ".dll");
            if (!File.Exists(path)) throw new FileNotFoundException("Faltan dependencias. Vuelve a copiar la carpeta completa de VtuberFriends.", path);
            handles[name] = NativeLibrary.Load(path);
        }
        // Discord.Net nightly 899 uses the pre-1.3 C ABI, with recognized IDs as call arguments.
        // libdave 1.3 removes those arguments and uses add/remove APIs instead.
        if (NativeLibrary.TryGetExport(handles["libdave"], "daveSessionAddRecognizedUser", out _))
            throw new InvalidOperationException("Dependencia DAVE incompatible. Usa las DLL incluidas con esta version de VtuberFriends.");
        foreach (Assembly asm in new[] { typeof(IAudioClient).Assembly, typeof(Discord.WebSocket.DiscordSocketClient).Assembly, typeof(Dave).Assembly }.Distinct())
            NativeLibrary.SetDllImportResolver(asm, (name, _, _) =>
                handles.GetValueOrDefault(Path.GetFileNameWithoutExtension(name)));
        if (!Dave.CheckAvailability() || Dave.MaxSupportedProtocolVersion == 0)
            throw new InvalidOperationException("libdave no proporciona un protocolo compatible.");
        Dave.SetLogSink((severity, file, line, message) => diagnostics?.ObserveNative(message));
        Console.WriteLine($"Nativas OK; DAVE máximo: {Dave.MaxSupportedProtocolVersion}. Esto no valida una llamada real.");
    }
}
