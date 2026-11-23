namespace VtuberFriends;
public enum AudioLifecycle { READER_STARTED, READER_RETRY, READER_FAILED, READER_DISPOSED, STREAM_UNREADABLE, VOICE_CONNECTED, VOICE_DISCONNECTED, GATEWAY_CONNECTED, GATEWAY_DISCONNECTED, STREAMS_RECONCILED, HEALTH_FLOWING, HEALTH_IDLE, AUTO_RECONNECT_ATTEMPT, AUTO_RECONNECT_OK, AUTO_RECONNECT_FAILED, AUTO_RECONNECT_PAUSED }
public enum AudioRecoveryReason { ReaderFailed, VoiceDisconnected, DecryptionStalled }
public sealed record ReaderHealth(int Active,int Tracked,int Faulted,int Exhausted,long? LastPcmAgeMs,long Restarts);
public sealed class ReaderRetryPolicy<T> where T:class
{
 private sealed class Fault(T stream){public T Stream=stream;public int Failures;public long? Since;public long Next;public bool Unreadable;}
 private readonly Dictionary<ulong,Fault> entries=new();
 public int Count=>entries.Count;
 public bool TryStart(ulong id,T stream,bool readable,long now,out bool retry,out bool unreadable){
  retry=false;unreadable=false;
  if(!entries.TryGetValue(id,out var item)||!ReferenceEquals(item.Stream,stream))entries[id]=item=new(stream);
  if(!readable){if(!item.Unreadable){item.Unreadable=true;item.Failures=3;item.Since??=now;unreadable=true;}return false;}
  if(item.Failures>=3||now<item.Next)return false;
  retry=item.Failures>0;return true;
 }
 public void Failed(ulong id,T stream,long now){if(entries.TryGetValue(id,out var f)&&ReferenceEquals(f.Stream,stream)){f.Since??=now;f.Failures++;f.Next=now+(f.Failures==1?2000:5000);}}
 public void Pcm(ulong id,T stream){if(entries.TryGetValue(id,out var f)&&ReferenceEquals(f.Stream,stream)){f.Failures=0;f.Since=null;f.Next=0;f.Unreadable=false;}}
 public void Retain(ISet<ulong> ids){foreach(var id in entries.Keys.Where(id=>!ids.Contains(id)).ToArray())entries.Remove(id);}
 public int Faulted=>entries.Values.Count(f=>f.Failures>0);
 public int Exhausted(long now)=>entries.Values.Count(f=>f.Failures>=3&&f.Since is long since&&now-since>=15000);
}
// Silence is NOT failure evidence. Only sustained disconnection, broken readers or advancing decrypt errors can request recovery.
public sealed class AudioStallPolicy
{
 private long? disconnectedSince,decryptSince;private int lastDecryptCount;
 public AudioRecoveryReason? Observe(long now,bool connected,ReaderHealth readers,int decryptErrors,bool fatal){
  if(fatal){disconnectedSince=null;decryptSince=null;lastDecryptCount=decryptErrors;return null;}
  if(!connected){disconnectedSince??=now;decryptSince=null;lastDecryptCount=decryptErrors;return now-disconnectedSince>=45000?AudioRecoveryReason.VoiceDisconnected:null;}
  disconnectedSince=null;
  if(readers.Exhausted>0)return AudioRecoveryReason.ReaderFailed;
  bool advancing=decryptErrors>lastDecryptCount;lastDecryptCount=decryptErrors;
  if(advancing&&(readers.LastPcmAgeMs is null||readers.LastPcmAgeMs>=15000))decryptSince??=now;else decryptSince=null;
  return decryptSince is long start&&now-start>=10000?AudioRecoveryReason.DecryptionStalled:null;
 }
}
public sealed class RecoveryBudget(long minimumDelayMs=60000,long windowMs=600000,int maximum=3)
{
 private readonly Queue<long> attempts=new();private readonly object gate=new();
 private void Prune(long now){while(attempts.TryPeek(out var first)&&now-first>=windowMs)attempts.Dequeue();}
 public long? Delay(long now){lock(gate){Prune(now);if(attempts.Count>=maximum)return null;return attempts.Count==0?0:Math.Max(0,attempts.Last()+minimumDelayMs-now);}}
 public bool Begin(long now){lock(gate){if(Delay(now)!=0)return false;attempts.Enqueue(now);return true;}}
 public long NextWindowDelay(long now){lock(gate){Prune(now);return attempts.Count>=maximum?Math.Max(1,attempts.Peek()+windowMs-now):0;}}
 public int Count{get{lock(gate)return attempts.Count;}}
 public void Reset(){lock(gate)attempts.Clear();}
}
public sealed record RecoveryView(string State="idle",string? Reason=null,int Attempts=0);

public sealed record RecoveryOptions(long MinimumDelayMs=60000,long WindowMs=600000,int MaximumAttempts=3);
