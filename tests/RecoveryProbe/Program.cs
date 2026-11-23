using VtuberFriends;
using System.Threading.Channels;
using System.Diagnostics;
static void Check(bool value,string message){if(!value)throw new Exception(message);}
static async Task Until(Func<bool> condition,string message,int timeout=3000){var timer=Stopwatch.StartNew();while(!condition()){if(timer.ElapsedMilliseconds>timeout)throw new Exception(message);await Task.Delay(5);}}
// Deterministic virtual time: hours of silence and moving PCM counters never imply a lost connection.
var policy=new AudioStallPolicy();var quiet=new ReaderHealth(2,2,0,0,null,0);
for(long time=0;time<12*60*60*1000L;time+=5000)Check(policy.Observe(time,true,quiet,0,false) is null,"Silence caused recovery");
Check(policy.Observe(0,false,quiet,0,false) is null,"Short disconnect caused recovery");Check(policy.Observe(44000,false,quiet,0,false) is null,"Reconnect grace too short");Check(policy.Observe(45000,false,quiet,0,false)==AudioRecoveryReason.VoiceDisconnected,"Disconnect not recovered");
Check(policy.Observe(45001,true,quiet,0,false) is null,"Healthy reconnect retained fault");
var stalled=quiet with {LastPcmAgeMs=20000};Check(policy.Observe(50000,true,stalled,20,false) is null,"Single crypto burst");Check(policy.Observe(55000,true,stalled,20,false) is null,"Old crypto errors caused recovery");
Check(policy.Observe(60000,true,stalled,30,false) is null,"crypto grace");policy.Observe(65000,true,stalled,40,false);Check(policy.Observe(70000,true,stalled,50,false)==AudioRecoveryReason.DecryptionStalled,"Continuous decrypt failure not detected");Check(policy.Observe(75000,true,stalled,60,true) is null,"Fatal DAVE retried");
var budget=new RecoveryBudget(60000,600000,3);Check(budget.Begin(0),"first attempt");Check(!budget.Begin(1)&&budget.Delay(1)==59999,"cooldown");Check(budget.Begin(60000)&&budget.Begin(120000)&&budget.Delay(180000) is null,"retry cap");Check(budget.Begin(600001),"budget window");
Console.WriteLine("PASS: 12h virtual silence, reconnect grace, progressing decrypt evidence only, fatal DAVE suppression and capped cooldown budget.");
// Actual asynchronous reader registry: failure/retry, authoritative new streams, cancellation and no task accumulation.
long now=0;int frames=0;var events=new List<AudioLifecycle>();
await using(var readers=new ManagedAudioReaders<FakeStream>((s,ct)=>s.Read(ct),s=>s.Readable,(_,_)=>Interlocked.Increment(ref frames),_=>{},e=>{lock(events)events.Add(e);},()=>Interlocked.Read(ref now))){
 var first=new FakeStream();readers.Reconcile(new Dictionary<ulong,FakeStream>{{1,first}});first.Send();await Until(()=>frames==1,"PCM not received");
 first.ThrowOnce=true;first.Send();await Until(()=>readers.Health.Active==0,"failed reader retained");Check(readers.PendingTasks==0,"finished task leaked");now=1000;readers.Reconcile(new Dictionary<ulong,FakeStream>{{1,first}});Check(readers.Health.Active==0,"retry loop ignored cooldown");now=3000;readers.Reconcile(new Dictionary<ulong,FakeStream>{{1,first}});first.Send();await Until(()=>frames==2,"same stream retry failed");Check(readers.Health.Restarts==1&&readers.Health.Faulted==0,"successful PCM did not reset retry state");
 var replacement=new FakeStream();readers.Reconcile(new Dictionary<ulong,FakeStream>{{1,replacement}});first.Send();replacement.Send();await Until(()=>frames==3,"replacement stream not bound");await Task.Delay(20);Check(frames==3,"old reader pushed stale PCM");
 replacement.Readable=false;now=4000;readers.Reconcile(new Dictionary<ulong,FakeStream>{{1,replacement}});await Until(()=>readers.PendingTasks==0,"unreadable reader not cancelled");now=20000;Check(readers.Health.Exhausted==1,"unreadable current stream not flagged");
 readers.Reconcile(new Dictionary<ulong,FakeStream>());Check(readers.Health.Tracked==0,"departed streams retained");
 for(int i=0;i<100;i++){var s=new FakeStream();readers.Reconcile(new Dictionary<ulong,FakeStream>{{1,s}});s.Send();readers.Reconcile(new Dictionary<ulong,FakeStream>());}await Until(()=>readers.PendingTasks==0,"reader task/CTS accumulation");
}
Console.WriteLine("PASS: real async readers restart after faults, rebind missed/replaced streams, suppress stale PCM, cancel disposed streams and prune 100 completed reader tasks.");
string root=Path.Combine(Path.GetTempPath(),"vf-recovery-"+Guid.NewGuid().ToString("N"));Directory.CreateDirectory(root);
using var log=new DiagnosticLog(Path.Combine(root,"logs"));string config=Path.Combine(root,"config.json"),vault=Path.Combine(root,"fake-token.dpapi");File.WriteAllText(config,"SYNTHETIC_CONFIG_SENTINEL");File.WriteAllText(vault,"SYNTHETIC_TOKEN_SENTINEL");
var made=new List<FakeReceiver>();var diagnostics=new List<AudioDiagnostics>();
IAudioReceiver Factory(Levels _,string guild,string channel,AudioDiagnostics diagnostic){var fake=new FakeReceiver();lock(made){made.Add(fake);diagnostics.Add(diagnostic);}return fake;}
var options=new RecoveryOptions(120,60000,3);
await using(var manager=new ConnectionManager(config,vault,new Levels(),log,false,Factory,()=>"SYNTHETIC_ONLY",options)){
 manager.SetInitial(new Config{GuildId="999999999999999999",ChannelId="999999999999999998"});await manager.ConnectSaved();Check(made.Count==1,"initial fake receiver");
 for(int i=0;i<3;i++){FakeReceiver current;lock(made)current=made[^1];current.Request();int expected=i+2;await Until(()=>{lock(made)return made.Count==expected;},"automatic recovery did not replace failed session");await Until(()=>{lock(made)return made[^1].Started;},"replacement not started");}
 lock(made)made[^1].Request();await Task.Delay(250);Check(made.Count==4,"unlimited reconnect loop");Check(System.Text.Json.JsonSerializer.Serialize(manager.Status).Contains("paused"),"paused status missing");
 await manager.ReconnectAudio();Check(made.Count==5,"manual reconnect did not reset budget");
 // A fault signal withdrawn during cooldown must not replace a now-healthy connection.
 made[^1].Request();await Until(()=>made.Count==6,"first recovery after manual reset");made[^1].Request();made[^1].Need=false;await Task.Delay(250);Check(made.Count==6,"healthy self-recovery still reconnected");
 await manager.Disconnect();Check(File.ReadAllText(config)=="SYNTHETIC_CONFIG_SENTINEL"&&File.ReadAllText(vault)=="SYNTHETIC_TOKEN_SENTINEL","recovery changed private files");
}
// Fatal MLS must win over a simultaneously requested network recovery.
made.Clear();diagnostics.Clear();await using(var manager=new ConnectionManager(config,vault,new Levels(),log,false,Factory,()=>"SYNTHETIC_ONLY",options)){
 manager.SetInitial(new Config{GuildId="999999999999999999",ChannelId="999999999999999998"});await manager.ConnectSaved();
 for(int i=0;i<3;i++)diagnostics[0].ObserveNative("MLS welcome lists unrecognized user ID");made[0].Request();await Until(()=>made[0].Halted,"fatal DAVE not halted");await Task.Delay(200);Check(made.Count==1,"fatal DAVE auto-retried");
}
// Fatal MLS also interrupts a pending cooldown; the old client must not be left unsupervised.
made.Clear();diagnostics.Clear();await using(var manager=new ConnectionManager(config,vault,new Levels(),log,false,Factory,()=>"SYNTHETIC_ONLY",new RecoveryOptions(500,60000,3))){
 manager.SetInitial(new Config{GuildId="999999999999999999",ChannelId="999999999999999998"});await manager.ConnectSaved();made[0].Request();await Until(()=>made.Count==2,"recovery before fatal test");made[1].Request();
 await Until(()=>System.Text.Json.JsonSerializer.Serialize(manager.Status).Contains("waiting"),"cooldown not observed");
 for(int i=0;i<3;i++)diagnostics[1].ObserveNative("MLS welcome lists unrecognized user ID");await Until(()=>made[1].Halted,"fatal during cooldown not halted");await Task.Delay(650);Check(made.Count==2,"fatal during cooldown reconnected");
}
int starts=0;bool failNew=true;FakeReceiver? initial=null;
IAudioReceiver FailingFactory(Levels _,string guild,string channel,AudioDiagnostics diagnostic){var fake=new FakeReceiver{FailStart=starts>0&&failNew};if(starts++==0)initial=fake;return fake;}
await using(var manager=new ConnectionManager(config,vault,new Levels(),log,false,FailingFactory,()=>"SYNTHETIC_ONLY",options)){
 manager.SetInitial(new Config{GuildId="999999999999999999",ChannelId="999999999999999998"});await manager.ConnectSaved();initial!.Request();await Until(()=>starts==4,"failed reconnect attempts missing");await Task.Delay(250);Check(starts==4,"failed reconnect loop exceeded cap");failNew=false;await manager.ReconnectAudio();Check(starts==5,"manual recovery after failure did not work");
}
made.Clear();diagnostics.Clear();await using(var manager=new ConnectionManager(config,vault,new Levels(),log,false,Factory,()=>"SYNTHETIC_ONLY",new RecoveryOptions(20,300,1))){
 manager.SetInitial(new Config{GuildId="999999999999999999",ChannelId="999999999999999998"});await manager.ConnectSaved();made[0].Request();await Until(()=>made.Count==2,"first recovery missing");made[1].Request();await Task.Delay(80);Check(made.Count==2,"retry window not respected");await Until(()=>made.Count==3,"recovery did not resume after window");await manager.Disconnect();await Task.Delay(350);Check(made.Count==3,"manual disconnect restarted receiver");
}
int startupAttempts=0;FakeReceiver? recoveredStartup=null;
IAudioReceiver StartupFactory(Levels _,string guild,string channel,AudioDiagnostics diagnostic){var fake=new FakeReceiver{FailStart=startupAttempts++==0};if(startupAttempts>1)recoveredStartup=fake;return fake;}
await using(var manager=new ConnectionManager(config,vault,new Levels(),log,false,StartupFactory,()=>"SYNTHETIC_ONLY",options)){
 manager.SetInitial(new Config{GuildId="999999999999999999",ChannelId="999999999999999998"});await manager.ConnectSaved();await Until(()=>recoveredStartup?.Started==true,"failed startup did not recover");Check(startupAttempts==2,"unexpected startup attempts");
}
Console.WriteLine("PASS: injected receiver sessions recover automatically, cap attempts, accept manual reconnect, avoid healthy replacements, never retry fatal MLS and preserve config/token bytes. No native DLL or real Discord loaded.");
sealed class FakeStream{
 private readonly Channel<byte[]> queue=Channel.CreateUnbounded<byte[]>();public bool Readable=true,ThrowOnce;
 public void Send()=>queue.Writer.TryWrite([0,64,0,64]);
 public async Task<ReadOnlyMemory<byte>> Read(CancellationToken ct){var bytes=await queue.Reader.ReadAsync(ct);if(ThrowOnce){ThrowOnce=false;throw new IOException("synthetic");}return bytes;}
}
sealed class FakeReceiver:IAudioReceiver{
 private TaskCompletionSource<AudioRecoveryReason> request=new(TaskCreationOptions.RunContinuationsAsynchronously);public bool Started,Halted,Disposed,Need,FailStart;
 public bool RecoveryStillNeeded=>Need;public Task<AudioRecoveryReason> RecoveryNeeded=>request.Task;public void ResetRecoverySignal()=>request=new(TaskCreationOptions.RunContinuationsAsynchronously);
 public void Request(){Need=true;request.TrySetResult(AudioRecoveryReason.ReaderFailed);}
 public Participant[] Participants=>[];public object LiveStatus=>new{mode="fake",status=Started?"connected":"starting"};public object Describe(object? r)=>new{mode="fake",status=Started?"connected":"starting",recovery=r};
 public Task StartAsync(string token,CancellationToken ct=default){if(token!="SYNTHETIC_ONLY")throw new Exception("unexpected token");if(FailStart)throw new InvalidOperationException("synthetic start failure");Started=true;return Task.CompletedTask;}
 public Task HaltAsync(string reason){Halted=true;return Task.CompletedTask;}public ValueTask DisposeAsync(){Disposed=true;Started=false;return ValueTask.CompletedTask;}
}
