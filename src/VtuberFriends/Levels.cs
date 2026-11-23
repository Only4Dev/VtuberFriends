using System.Buffers.Binary;
using System.Collections.Concurrent;

namespace VtuberFriends;

public sealed record UserLevel(string UserId, double Rms, double Peak, bool Speaking, long Frames, long Bytes);
public sealed class Levels
{
    private sealed record Entry(double Rms, double Peak, long Frames, long Bytes, long Seen);
    private readonly ConcurrentDictionary<string, Entry> users = new();
    public void Push(string id, ReadOnlySpan<byte> pcm)
    {
        if (pcm.Length == 0 || pcm.Length % 2 != 0) return;
        double sum = 0, peak = 0;
        for (int i = 0; i < pcm.Length; i += 2)
        {
            double sample = BinaryPrimitives.ReadInt16LittleEndian(pcm[i..]) / 32768.0;
            sum += sample * sample;
            peak = Math.Max(peak, Math.Abs(sample));
        }
        var rms = Math.Sqrt(sum / (pcm.Length / 2));
        var now = Environment.TickCount64; int length = pcm.Length;
        users.AddOrUpdate(id, new Entry(rms, peak, 1, length, now),
            (_, old) => new(rms, peak, old.Frames + 1, old.Bytes + length, now));
    }
    public void Silence(string id)
    {
        if (users.TryGetValue(id, out var old)) users.TryUpdate(id, old with { Rms = 0, Peak = 0, Seen = 0 }, old);
    }
    public void SilenceAll() { foreach (var id in users.Keys) Silence(id); }
    public UserLevel[] Snapshot() => users.OrderBy(p => p.Key).Select(p =>
    {
        bool fresh = Environment.TickCount64 - p.Value.Seen < 250;
        double rms = fresh ? p.Value.Rms : 0;
        return new UserLevel(p.Key, rms, fresh ? p.Value.Peak : 0, rms >= 0.015, p.Value.Frames, p.Value.Bytes);
    }).ToArray();
}
