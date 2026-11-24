using System.Text.Json;
using System.Text.RegularExpressions;
namespace VtuberFriends;
public sealed record ConnectionSettings(string GuildId,string ChannelId,string? Token=null);
public sealed class ConnectionManager(string configPath,string tokenPath,Levels levels,DiagnosticLog log,bool demo,
 Func<Levels,string,string,AudioDiagnostics,IAudioReceiver>? receiverFactory=null,Func<string?>? tokenReader=null,RecoveryOptions? recoveryOptions=null) : IAsyncDisposable
{
 private readonly SemaphoreSlim gate=new(1);private IAudioReceiver? receiver;private CancellationTokenSource? watchStop;private Task? watch;private CancellationTokenSource? connecting;
 private readonly CancellationTokenSource lifetime=new();private Task? recoveryTask;private long generation;
 private readonly RecoveryBudget budget=new(recoveryOptions?.MinimumDelayMs??60000,recoveryOptions?.WindowMs??600000,recoveryOptions?.MaximumAttempts??3);
 private RecoveryView recoveryView=new();private bool cleanupBlocked;private Task? unfinishedCleanup;
 private int shuttingDown;private AudioDiagnostics? diagnostics;private string state="unconfigured";private Config config=new();
 public object Status=>receiver?.Describe(Volatile.Read(ref recoveryView))??new {mode=demo?"demo":"discord",status=demo?"synthetic":state,diagnostics=diagnostics?.Snapshot,recovery=Volatile.Read(ref recoveryView),acceptance="PENDING_LIVE_MANUAL_TEST"};
 public object LiveStatus=>receiver?.LiveStatus??new{mode=demo?"demo":"discord",status=demo?"synthetic":state};
 public Participant[] Participants=>receiver?.Participants??[];
 public object Supervision=>new{watch=watch?.Status.ToString()??"NotStarted",recoveryTask=recoveryTask?.Status.ToString()??"NotStarted",cleanupBlocked,cleanupPending=unfinishedCleanup is {IsCompleted:false},shuttingDown=Volatile.Read(ref shuttingDown)==1};
 public bool HasSetup=>config.Port!=17861||!string.IsNullOrWhiteSpace(config.GuildId)||!string.IsNullOrWhiteSpace(config.ChannelId)||File.Exists(tokenPath)||!string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("VF_DISCORD_BOT_TOKEN"));
 public object Settings=>new{guildId=config.GuildId,channelId=config.ChannelId,hasToken=File.Exists(tokenPath)||!string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("VF_DISCORD_BOT_TOKEN")),demo};
 public void SetInitial(Config value)=>config=value;
 public static void Validate(ConnectionSettings value){if(!Regex.IsMatch(value.GuildId??"",@"^\d{17,20}$")||!Regex.IsMatch(value.ChannelId??"",@"^\d{17,20}$"))throw new ArgumentException("Introduce IDs válidos de servidor y canal de voz (17 a20 dígitos).");if(value.Token?.Length>512)throw new ArgumentException("Token demasiado largo.");}
 private void ManualAction(){Interlocked.Increment(ref generation);budget.Reset();Volatile.Write(ref recoveryView,new());CancelConnecting();}
 public async Task SaveAndConnect(ConnectionSettings value){
  Validate(value);if(demo)throw new ArgumentException("La demo no conecta a Discord.");ManualAction();
  await gate.WaitAsync();try{
   if(!string.IsNullOrWhiteSpace(value.Token))TokenVault.Save(tokenPath,value.Token);
   config=new Config{GuildId=value.GuildId,ChannelId=value.ChannelId,Port=config.Port};
   Directory.CreateDirectory(Path.GetDirectoryName(configPath)!);await File.WriteAllTextAsync(configPath+".tmp",JsonSerializer.Serialize(config,new JsonSerializerOptions{WriteIndented=true}));File.Move(configPath+".tmp",configPath,true);
   if(!await ConnectLocked(false))QueueFailedStart();
  }finally{gate.Release();}
 }
 public async Task ConnectSaved(){ManualAction();await gate.WaitAsync();try{if(!demo&&!string.IsNullOrEmpty(config.GuildId)&&!string.IsNullOrEmpty(config.ChannelId)&&!await ConnectLocked(false))QueueFailedStart();}finally{gate.Release();}}
 public async Task ReconnectAudio(){if(demo)throw new ArgumentException("No disponible en demo.");Validate(new(config.GuildId,config.ChannelId));await ConnectSaved();}
 private async Task<bool> ConnectLocked(bool automatic){
  if(unfinishedCleanup is {IsCompleted:false}){cleanupBlocked=true;state="cleanup_pending";return false;}
  cleanupBlocked=!await DisconnectLocked(automatic);if(cleanupBlocked||Volatile.Read(ref shuttingDown)==1)return false;
  if(automatic&&diagnostics?.Fatal.IsCompleted==true){state="dave_failed";return false;}
  string? token=null;
  try{
   token=tokenReader is not null?tokenReader():TokenVault.Read(tokenPath)??Environment.GetEnvironmentVariable("VF_DISCORD_BOT_TOKEN");
   if(string.IsNullOrWhiteSpace(token)){state="token_required";return false;}
   diagnostics=new AudioDiagnostics(log);if(receiverFactory is null)NativeAudio.SetDiagnostics(diagnostics);
   receiver=receiverFactory is not null?receiverFactory(levels,config.GuildId,config.ChannelId,diagnostics)??throw new InvalidOperationException("Receiver factory returned null."):new DiscordReceiver(levels,config.GuildId,config.ChannelId,diagnostics);state="starting";
   connecting=CancellationTokenSource.CreateLinkedTokenSource(lifetime.Token);await receiver.StartAsync(token,connecting.Token);
   watchStop=new();watch=Watch(receiver,diagnostics,Interlocked.Read(ref generation),watchStop.Token);return !diagnostics.Fatal.IsCompleted;
  }catch(Exception failure){log.Record(connecting?.IsCancellationRequested==true?"CONNECTION_START_CANCELLED":"CONNECTION_START_FAILED");cleanupBlocked=!await DisconnectLocked(automatic);state=diagnostics?.Fatal.IsCompleted==true?"dave_failed":failure is Discord.Net.HttpException {HttpCode:System.Net.HttpStatusCode.Unauthorized}?"auth_failed":"connection_failed";return false;}
  finally{token=null;connecting?.Dispose();connecting=null;}
 }
 private async Task Watch(IAudioReceiver target,AudioDiagnostics diagnostic,long version,CancellationToken cancellation){
  try{
   await Task.WhenAny(diagnostic.Fatal,target.RecoveryNeeded,Task.Delay(Timeout.Infinite,cancellation));cancellation.ThrowIfCancellationRequested();
   if(diagnostic.Fatal.IsCompleted){Volatile.Write(ref recoveryView,new("blocked",await diagnostic.Fatal,budget.Count));await target.HaltAsync(await diagnostic.Fatal).WaitAsync(cancellation);return;}
   if(target.RecoveryNeeded.IsCompletedSuccessfully){
    var reason=await target.RecoveryNeeded;recoveryTask=Task.Run(()=>Recover(target,diagnostic,version,reason));
    // Keep the fatal guard active during cooldown or after the retry budget is exhausted.
    var fatal=await diagnostic.Fatal.WaitAsync(cancellation);Volatile.Write(ref recoveryView,new("blocked",fatal,budget.Count));await target.HaltAsync(fatal).WaitAsync(cancellation);
   }
  }catch(OperationCanceledException){}
 }
 private async Task Recover(IAudioReceiver? target,AudioDiagnostics diagnostic,long version,AudioRecoveryReason reason){
  bool first=target is not null;
  try{while(!lifetime.IsCancellationRequested&&version==Interlocked.Read(ref generation)){
   if(diagnostic.Fatal.IsCompleted)return;
   long? delay=budget.Delay(Environment.TickCount64);
   if(delay is null){Pause(reason);await WaitRecovery(budget.NextWindowDelay(Environment.TickCount64),version);continue;}
   Volatile.Write(ref recoveryView,new("waiting",reason.ToString(),budget.Count));
   if(delay>0)await WaitRecovery(delay.Value,version);
   await gate.WaitAsync(lifetime.Token);
   try{
    if(version!=Interlocked.Read(ref generation)||shuttingDown==1||diagnostic.Fatal.IsCompleted||first&&!ReferenceEquals(receiver,target))return;
    if(first&&!target!.RecoveryStillNeeded){
     await watchStop!.CancelAsync();if(watch is not null)await watch;watchStop.Dispose();watchStop=new();
     target.ResetRecoverySignal();watch=Watch(target,diagnostic,version,watchStop.Token);Volatile.Write(ref recoveryView,new("idle",reason.ToString(),budget.Count));return;
    }
    if(!budget.Begin(Environment.TickCount64))continue;
    first=false;Volatile.Write(ref recoveryView,new("reconnecting",reason.ToString(),budget.Count));log.Record("AUDIO_RECOVERY_"+reason.ToString().ToUpperInvariant());log.Record("AUDIO_AUTO_RECONNECT_ATTEMPT");
    bool success=await ConnectLocked(true);
    if(success){log.Record("AUDIO_AUTO_RECONNECT_OK");Volatile.Write(ref recoveryView,new("recovered",reason.ToString(),budget.Count));return;}
    log.Record("AUDIO_AUTO_RECONNECT_FAILED");
    if(cleanupBlocked||diagnostics?.Fatal.IsCompleted==true||diagnostic.Fatal.IsCompleted){Pause(reason);return;}
   }finally{gate.Release();}
  }}catch(OperationCanceledException){}
 }
 private async Task WaitRecovery(long delay,long version){while(delay>0&&!lifetime.IsCancellationRequested&&version==Interlocked.Read(ref generation)){long chunk=Math.Min(5000,delay);await Task.Delay(TimeSpan.FromMilliseconds(chunk),lifetime.Token);delay-=chunk;}}
 private void QueueFailedStart(){if(state!="connection_failed"||cleanupBlocked||diagnostics is null||diagnostics.Fatal.IsCompleted||shuttingDown==1)return;var failed=diagnostics;long version=Interlocked.Read(ref generation);recoveryTask=Task.Run(()=>Recover(null,failed,version,AudioRecoveryReason.VoiceDisconnected));}
 private void Pause(AudioRecoveryReason reason){Volatile.Write(ref recoveryView,new("paused",reason.ToString(),budget.Count));if(receiver is null&&state!="dave_failed")state="recovery_paused";log.Record("AUDIO_AUTO_RECONNECT_PAUSED");}
 public void BeginShutdown(){Interlocked.Exchange(ref shuttingDown,1);lifetime.Cancel();CancelConnecting();}
 public void CancelConnecting(){try{connecting?.Cancel();}catch(ObjectDisposedException){}}
 public async Task Disconnect(){ManualAction();await gate.WaitAsync();try{await DisconnectLocked(false);state="disconnected";}finally{gate.Release();}}
 private async Task<bool> DisconnectLocked(bool recovery=false){
  bool bounded=true,complete=true;
  var old=receiver;receiver=null;levels.SilenceAll();
  if(watchStop is not null){await watchStop.CancelAsync();if(watch is not null){
   if(bounded)await ShutdownTasks.TryAsync(()=>watch,TimeSpan.FromSeconds(2),()=>{complete=false;log.Record("CONNECTION_STOP_INCOMPLETE");});
   else try{await watch;}catch{log.Record("CONNECTION_STOP_FAILED");}
  }watchStop.Dispose();watchStop=null;watch=null;}
  if(old is not null){
   if(bounded){unfinishedCleanup=old.DisposeAsync().AsTask();await ShutdownTasks.TryAsync(()=>unfinishedCleanup,TimeSpan.FromSeconds(6),()=>{complete=false;log.Record("CONNECTION_STOP_INCOMPLETE");});}
   else try{await old.DisposeAsync();}catch{log.Record("CONNECTION_STOP_FAILED");}
  }
  return complete;
 }
 public async ValueTask DisposeAsync(){BeginShutdown();if(recoveryTask is not null)await ShutdownTasks.TryAsync(()=>recoveryTask,TimeSpan.FromSeconds(8),()=>log.Record("RECOVERY_STOP_INCOMPLETE"));await Disconnect();gate.Dispose();lifetime.Dispose();}
}
