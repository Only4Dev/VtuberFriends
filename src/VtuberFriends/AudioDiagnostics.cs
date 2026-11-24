using System.Collections.Concurrent;
using System.Text.RegularExpressions;
namespace VtuberFriends;

// Only categorical diagnostics and public Discord IDs are retained, never raw payloads.
public sealed class AudioDiagnostics(DiagnosticLog? log = null)
{
    private readonly object gate = new();
    private readonly TaskCompletionSource<string> fatal = new(TaskCreationOptions.RunContinuationsAsynchronously);
    private readonly ConcurrentDictionary<string, int> packetErrors = new();
    private readonly ConcurrentDictionary<string, int> warningKinds = new();
    private readonly ConcurrentQueue<long> warningTimes = new();
    private readonly ConcurrentDictionary<string, ConcurrentQueue<long>> recentKinds = new();
    private readonly ConcurrentQueue<long> packetTimes = new();
    private readonly ConcurrentQueue<long> decryptTimes = new();
    private int managedDecryptFailures;
    public int DecryptFailureCount=>Volatile.Read(ref decryptFailures)+Volatile.Read(ref managedDecryptFailures);
    public void RecordAudioEvent(AudioLifecycle kind)=>log?.Record("AUDIO_"+kind);
    private int nativeMessages, mlsFailures, decryptFailures, established, requestedProtocol, decryptedAudio;
    private long windowStart;
    private int windowFailures;
    private string? rejectedUserId, recognizedUserIds;
    public Task<string> Fatal => fatal.Task;
    public int EstablishedProtocolVersion => Volatile.Read(ref established) == 1 ? Volatile.Read(ref requestedProtocol) : 0;
    public object Snapshot => new { nativeMessages = Volatile.Read(ref nativeMessages),
        log = log?.Status, packetErrorsLast60Seconds = Recent(packetTimes),
        warningKindsLast60Seconds = recentKinds.ToArray().Select(p => new { p.Key, Count = Recent(p.Value) }).Where(p => p.Count > 0).ToDictionary(p => p.Key, p => p.Count),
        warningsLast60Seconds = Recent(warningTimes), decryptFailuresLast60Seconds = Recent(decryptTimes),
        warningKinds = warningKinds.ToArray().ToDictionary(p => p.Key, p => p.Value),
        mlsFailures = Volatile.Read(ref mlsFailures), decryptFailures = Volatile.Read(ref decryptFailures),managedDecryptFailures=Volatile.Read(ref managedDecryptFailures),
        mlsEstablished = Volatile.Read(ref established) == 1,
        nativeAudioDecryptionsObserved = Volatile.Read(ref decryptedAudio),
        packetErrors = packetErrors.ToArray().ToDictionary(p => p.Key, p => p.Value),
        rejectedUserId, recognizedUserIds, fault = fatal.Task.IsCompletedSuccessfully ? fatal.Task.Result : null };

    private static int Recent(ConcurrentQueue<long> times)
    {
        long cutoff = Environment.TickCount64 - 60_000;
        while (times.TryPeek(out long time) && time < cutoff) times.TryDequeue(out _);
        return times.Count;
    }
    private static void AddRecent(ConcurrentQueue<long> times) { times.Enqueue(Environment.TickCount64); Recent(times); }
    public string RecordWarning(string message)
    {
        AddRecent(warningTimes);
        string kind;
        var decrypt = Regex.Match(message, @"^Failed to decrypt audio packet for \d+: ([A-Za-z0-9_]{1,60})$");
        var opcode = Regex.Match(message, @"^Unknown OpCode \((\d{1,3})\)$");
        if (decrypt.Success) {kind = "DAVE_DECRYPT_" + decrypt.Groups[1].Value;Interlocked.Increment(ref managedDecryptFailures);}
        else if (opcode.Success) kind = "VOICE_OPCODE_" + opcode.Groups[1].Value;
        else if (message.StartsWith("Unexpected transition id:", StringComparison.Ordinal)) kind = "DAVE_UNEXPECTED_TRANSITION";
        else if (message.StartsWith("Audio connection terminated", StringComparison.Ordinal)) kind = "VOICE_CONNECTION_INTERRUPTED";
        else kind = "OTHER_DISCORD_WARNING";
        warningKinds.AddOrUpdate(kind, 1, (_, count) => count + 1);
        AddRecent(recentKinds.GetOrAdd(kind, _ => new()));
        log?.Record(kind);
        return kind;
    }

    public void RecordReaderError() => log?.Record("AUDIO_READER_ERROR");

    public void ObserveManaged(string message, string? exceptionType = null)
    {
        var recognized = Regex.Match(message, @"^Processing MLS proposal; our users: \[([0-9, ]*)\]$");
        if (recognized.Success) recognizedUserIds = recognized.Groups[1].Value;
        // The upstream initial transition (id=0) does not emit an Execute log.
        var version = Regex.Match(message, @"^(?:Init dave protocol session, version |Preparing to transition to protocol version )(\d+)");
        if (version.Success) Volatile.Write(ref requestedProtocol, int.Parse(version.Groups[1].Value));
        if (message.Contains("Malformed Frame", StringComparison.OrdinalIgnoreCase))
        {
            string category = "MalformedFrame:" + (exceptionType ?? "Unknown");
            packetErrors.AddOrUpdate(category, 1, (_, count) => count + 1);
            AddRecent(packetTimes);log?.Record("MALFORMED_FRAME");
        }
    }

    public void ObserveNative(string message)
    {
        Interlocked.Increment(ref nativeMessages);
        if (message.Contains("Resetting MLS session", StringComparison.Ordinal))
            Volatile.Write(ref established, 0);
        if (message.Contains("Successfully processed MLS commit", StringComparison.Ordinal)
            || message.Contains("Successfully welcomed to MLS Group", StringComparison.Ordinal))
            Volatile.Write(ref established, 1);
        var decrypted = Regex.Match(message, @"^Decrypted audio: (\d+)");
        if (decrypted.Success)
        {
            int count = int.Parse(decrypted.Groups[1].Value);
            int old;
            do { old = Volatile.Read(ref decryptedAudio); if (count <= old) break; }
            while (Interlocked.CompareExchange(ref decryptedAudio, count, old) != old);
        }
        var rejected = Regex.Match(message, @"Attempted to verify credential for unrecognized user ID: (\d{1,20})");
        if (rejected.Success) rejectedUserId = rejected.Groups[1].Value;
        if (message.Contains("Decrypt failed", StringComparison.OrdinalIgnoreCase))
            { Interlocked.Increment(ref decryptFailures); AddRecent(decryptTimes);log?.Record("NATIVE_DECRYPT_FAILED"); }
        if (!message.Contains("MLS welcome lists unrecognized user ID", StringComparison.Ordinal)
            && !message.Contains("MLS add proposal must be for recognized user", StringComparison.Ordinal))
            return;
        Interlocked.Increment(ref mlsFailures);log?.Record("DAVE_MLS_REJECTED_USER");
        lock (gate)
        {
            long now = Environment.TickCount64;
            if (windowFailures == 0 || now - windowStart > 10_000) { windowStart = now; windowFailures = 0; }
            if (++windowFailures >= 3)
                fatal.TrySetResult("DAVE_MLS_REJECTED_USERS");
        }
    }
}
