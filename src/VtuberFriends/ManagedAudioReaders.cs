namespace VtuberFriends;
// Owns only active readers, never records PCM. Every completed task/CTS is released, including replacements and failures.
public sealed class ManagedAudioReaders<T>(Func<T,CancellationToken,Task<ReadOnlyMemory<byte>>> read,Func<T,bool> readable,Action<ulong,ReadOnlyMemory<byte>> pcm,Action<ulong> silence,Action<AudioLifecycle> record,Func<long>? clock=null) : IAsyncDisposable where T:class
{
 private sealed class Reader(T stream,CancellationTokenSource cancellation){public T Stream=stream;public CancellationTokenSource Stop=cancellation;}
 private readonly object gate=new();private readonly Dictionary<ulong,Reader> readers=new();private readonly HashSet<Task> tasks=[];
 private readonly ReaderRetryPolicy<T> retry=new();private readonly CancellationTokenSource stop=new();private long lastPcm=-1,restarts;
 private long Now=>clock?.Invoke()??Environment.TickCount64;
 public ReaderHealth Health{get{lock(gate){long now=Now;return new(readers.Count,retry.Count,retry.Faulted,retry.Exhausted(now),lastPcm<0?null:Math.Max(0,now-lastPcm),restarts);}}}
 public int PendingTasks{get{lock(gate)return tasks.Count;}}
 public void Reconcile(IReadOnlyDictionary<ulong,T> streams){
  lock(gate){if(stop.IsCancellationRequested)return;
   foreach(var id in readers.Keys.Where(id=>!streams.ContainsKey(id)).ToArray()){var old=readers[id];readers.Remove(id);old.Stop.Cancel();silence(id);}
   retry.Retain(streams.Keys.ToHashSet());foreach(var pair in streams)Attach(pair.Key,pair.Value);
  }
 }
 public void Attach(ulong id,T stream){lock(gate){
  if(stop.IsCancellationRequested)return;
  bool canRead;try{canRead=readable(stream);}catch(ObjectDisposedException){canRead=false;}
  if(readers.TryGetValue(id,out var existing)){
   if(ReferenceEquals(existing.Stream,stream)&&canRead)return;
   readers.Remove(id);existing.Stop.Cancel();silence(id);
  }
  if(!retry.TryStart(id,stream,canRead,Now,out bool restarted,out bool unreadable)){if(unreadable)record(AudioLifecycle.STREAM_UNREADABLE);return;}
  var reader=new Reader(stream,CancellationTokenSource.CreateLinkedTokenSource(stop.Token));readers[id]=reader;
  if(restarted){restarts++;record(AudioLifecycle.READER_RETRY);}else record(AudioLifecycle.READER_STARTED);
  Task? task=null;task=Task.Run(async()=>{
   try{while(!reader.Stop.IsCancellationRequested){var frame=await read(stream,reader.Stop.Token);if(frame.Length>0&&frame.Length%2==0){lock(gate){if(readers.TryGetValue(id,out var current)&&ReferenceEquals(current,reader)&&!reader.Stop.IsCancellationRequested&&!stop.IsCancellationRequested){pcm(id,frame);lastPcm=Now;retry.Pcm(id,stream);}}}}}
   catch(OperationCanceledException) when(reader.Stop.IsCancellationRequested){}
   catch(Exception error){lock(gate){if(readers.TryGetValue(id,out var current)&&ReferenceEquals(current,reader)&&!reader.Stop.IsCancellationRequested){retry.Failed(id,stream,Now);record(error is ObjectDisposedException?AudioLifecycle.READER_DISPOSED:AudioLifecycle.READER_FAILED);}}}
   finally{lock(gate){if(readers.TryGetValue(id,out var current)&&ReferenceEquals(current,reader)){readers.Remove(id);silence(id);}tasks.Remove(task!);reader.Stop.Dispose();}}
  });tasks.Add(task);
 }}
 public async ValueTask DisposeAsync(){await stop.CancelAsync();Task[] pending;lock(gate)pending=tasks.ToArray();await Task.WhenAll(pending).WaitAsync(TimeSpan.FromSeconds(5));stop.Dispose();}
}
