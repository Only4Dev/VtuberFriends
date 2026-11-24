using System.Text.Json;
using System.Text.RegularExpressions;
namespace VtuberFriends;

public sealed record ReportContext(string Symptom="audio_frozen",string Discord="unknown",string Panel="unknown",string Streamlabs="unknown",string Affected="unknown");
public sealed record SourceDiagnostic(int SourceId,string Event,double? FrameAgeMs=null,bool Fresh=false,bool ContextLost=false);
public sealed record HealthRow(DateTimeOffset Utc,string Version,string Session,long UptimeMs,string Trigger,Dictionary<string,long?> Metrics,Dictionary<string,string> States);
public sealed class DiagnosticReport : IDisposable
{
 private static readonly JsonSerializerOptions Json=new(JsonSerializerDefaults.Web){WriteIndented=false};
 private readonly object gate=new();private readonly string directory,session=Guid.NewGuid().ToString("N");private readonly Func<HealthRow> collect;private readonly DiagnosticLog events;private readonly Timer timer;private readonly long started=Environment.TickCount64,maxBytes;
 private readonly Dictionary<int,(long Seen,SourceDiagnostic Value)> sources=new();private bool disposed,writeFailed;private long sourceErrors,contextLosses;private HealthRow? latest;
 private static readonly string[] Tasks=["NotStarted","Created","WaitingForActivation","WaitingToRun","Running","WaitingForChildrenToComplete","RanToCompletion","Canceled","Faulted"];
 private static readonly Dictionary<string,string[]> StateValues=new(){
  ["receiver"]=["unknown","starting","connected","disconnected","unconfigured","token_required","connection_failed","cleanup_pending","auth_failed","dave_failed","recovery_paused","synthetic"],
  ["mode"]=["unknown","discord","demo"],["gateway"]=["unknown","None","Connecting","Connected","Disconnecting","Disconnected"],["voice"]=["unknown","None","Connecting","Connected","Disconnecting","Disconnected"],
  ["recovery"]=["unknown","idle","waiting","reconnecting","recovered","paused","blocked"],["reason"]=["unknown","ReaderFailed","VoiceDisconnected","DecryptionStalled","DAVE_MLS_REJECTED_USERS"],
  ["watch"]=Tasks,["recoveryTask"]=Tasks,["pump"]=Tasks,["capture"]=["ok","error"]};
 private static readonly HashSet<string> MetricNames=["participants","sourcesEnabled","testMode","pcmUsers","maxRmsMicros","maxPeakMicros","pcmFrames","pcmBytes","activeReaders","trackedReaders","faultedReaders","exhaustedReaders","lastPcmAgeMs","readerRestarts","protocol","warnings60s","decryptErrors60s","decryptErrorsTotal","malformedFrames","mlsFailures","recoveryAttempts","cleanupBlocked","cleanupPending","liveClients","liveFrames","lastLiveFrameAgeMs","sourceClientsRecent","sourceClientsStale","sourceContextLost","sourceErrors","contextLosses","lastSourceAgeMs"];
 public DiagnosticReport(string directory,Func<HealthRow> collect,DiagnosticLog events,long maxBytes=1024*1024){this.directory=Path.GetFullPath(directory);this.collect=collect;this.events=events;this.maxBytes=Math.Max(512,maxBytes);timer=new(_=>Capture("periodic"),null,Timeout.Infinite,Timeout.Infinite);}
 public void Start(){Capture("startup");timer.Change(15000,15000);}
 public object Status{get{lock(gate)return new{enabled=true,intervalSeconds=15,writeFailed,relativePath="logs/diagnostic-health.jsonl",lastCaptureUtc=latest?.Utc};}}
 public static HealthRow Project(object receiver,object supervision,object feed,UserLevel[] users,int participants,int enabled,bool test){
  var r=JsonSerializer.SerializeToElement(receiver,Json);var s=JsonSerializer.SerializeToElement(supervision,Json);var f=JsonSerializer.SerializeToElement(feed,Json);
  JsonElement Child(JsonElement e,string key)=>e.ValueKind==JsonValueKind.Object&&e.TryGetProperty(key,out var v)?v:default;
  long? Num(JsonElement e,string key){var v=Child(e,key);return v.ValueKind==JsonValueKind.Number&&v.TryGetInt64(out long n)&&n>=0?n:null;}
  long Bool(JsonElement e,string key)=>Child(e,key).ValueKind==JsonValueKind.True?1:0;
  string State(JsonElement e,string key)=>Child(e,key).ValueKind==JsonValueKind.String?Child(e,key).GetString()??"unknown":"unknown";
  var h=Child(r,"audioHealth");var d=Child(r,"diagnostics");var recovery=Child(r,"recovery");long malformed=0;var packets=Child(d,"packetErrors");if(packets.ValueKind==JsonValueKind.Object)foreach(var p in packets.EnumerateObject())if(p.Value.ValueKind==JsonValueKind.Number&&p.Value.TryGetInt64(out long n)&&n>=0)malformed+=Math.Min(n,1_000_000_000);
  return new(default,UpdateService.Version,"",0,"periodic",new(){
   ["participants"]=participants,["sourcesEnabled"]=enabled,["testMode"]=test?1:0,["pcmUsers"]=users.Count(u=>u.Rms>0),["maxRmsMicros"]=(long)Math.Round(Math.Clamp(users.Select(u=>u.Rms).DefaultIfEmpty(0).Max(),0,1)*1_000_000),["maxPeakMicros"]=(long)Math.Round(Math.Clamp(users.Select(u=>u.Peak).DefaultIfEmpty(0).Max(),0,1)*1_000_000),["pcmFrames"]=users.Sum(u=>u.Frames),["pcmBytes"]=users.Sum(u=>u.Bytes),
   ["activeReaders"]=Num(h,"active"),["trackedReaders"]=Num(h,"tracked"),["faultedReaders"]=Num(h,"faulted"),["exhaustedReaders"]=Num(h,"exhausted"),["lastPcmAgeMs"]=Num(h,"lastPcmAgeMs"),["readerRestarts"]=Num(h,"restarts"),
   ["protocol"]=Num(r,"observedProtocolVersion"),["warnings60s"]=Num(d,"warningsLast60Seconds"),["decryptErrors60s"]=Num(d,"decryptFailuresLast60Seconds"),["decryptErrorsTotal"]=(Num(d,"decryptFailures")??0)+(Num(d,"managedDecryptFailures")??0),["malformedFrames"]=malformed,["mlsFailures"]=Num(d,"mlsFailures"),["recoveryAttempts"]=Num(recovery,"attempts"),
   ["cleanupBlocked"]=Bool(s,"cleanupBlocked"),["cleanupPending"]=Bool(s,"cleanupPending"),["liveClients"]=Num(f,"clients"),["liveFrames"]=Num(f,"frames"),["lastLiveFrameAgeMs"]=Num(f,"lastFrameAgeMs")},
   new(){["receiver"]=State(r,"status"),["mode"]=State(r,"mode"),["gateway"]=State(r,"gatewayState"),["voice"]=State(r,"voiceState"),["recovery"]=State(recovery,"state"),["reason"]=State(recovery,"reason"),["watch"]=State(s,"watch"),["recoveryTask"]=State(s,"recoveryTask"),["pump"]=State(f,"pump"),["capture"]="ok"});
 }
 public void Source(SourceDiagnostic value,ISet<int> validIds){
  if(!validIds.Contains(value.SourceId)||value.Event is not ("heartbeat" or "js_error" or "context_lost" or "context_restored")||value.FrameAgeMs is double age&&(!double.IsFinite(age)||age<0||age>86_400_000))throw new ArgumentException("Invalid source diagnostic.");
  lock(gate){if(disposed)return;long now=Environment.TickCount64;if(sources.TryGetValue(value.SourceId,out var previous)&&previous.Value.Event==value.Event&&now-previous.Seen<5000)return;
   if(sources.Count>=64&&!sources.ContainsKey(value.SourceId)){var oldest=sources.MinBy(p=>p.Value.Seen).Key;sources.Remove(oldest);}
   sources[value.SourceId]=(now,value);if(value.Event=="js_error")sourceErrors++;if(value.Event=="context_lost")contextLosses++;
   if(value.Event!="heartbeat")events.Record(value.Event switch{"js_error"=>"SOURCE_JS_ERROR","context_lost"=>"SOURCE_WEBGL_LOST",_=>"SOURCE_WEBGL_RESTORED"});
  }
 }
 public void Capture(string trigger){lock(gate){if(disposed)return;
  HealthRow raw;try{raw=collect();}catch{raw=new(default,UpdateService.Version,"",0,"periodic",[],new(){["capture"]="error"});}
  long now=Environment.TickCount64;raw.Metrics["sourceClientsRecent"]=sources.Values.Count(s=>now-s.Seen<90000);raw.Metrics["sourceClientsStale"]=sources.Values.Count(s=>now-s.Seen<90000&&!s.Value.Fresh);raw.Metrics["sourceContextLost"]=sources.Values.Count(s=>now-s.Seen<90000&&s.Value.ContextLost);raw.Metrics["sourceErrors"]=sourceErrors;raw.Metrics["contextLosses"]=contextLosses;raw.Metrics["lastSourceAgeMs"]=sources.Count==0?null:now-sources.Values.Max(s=>s.Seen);
  latest=Clean(raw with{Utc=DateTimeOffset.UtcNow,Session=session,UptimeMs=now-started,Trigger=trigger});
  try{Directory.CreateDirectory(directory);string path=Path.Combine(directory,"diagnostic-health.jsonl");if(File.Exists(path)&&new FileInfo(path).Length>=maxBytes)for(int i=3;i>=1;i--){string from=Path.Combine(directory,i==1?"diagnostic-health.jsonl":$"diagnostic-health.{i-1}.jsonl");if(File.Exists(from))File.Move(from,Path.Combine(directory,$"diagnostic-health.{i}.jsonl"),true);}File.AppendAllText(path,JsonSerializer.Serialize(latest,Json)+Environment.NewLine);writeFailed=false;}catch(Exception e)when(e is IOException or UnauthorizedAccessException){writeFailed=true;}
 }}
 private static HealthRow Clean(HealthRow row){
  var metrics=row.Metrics?.Where(p=>MetricNames.Contains(p.Key)).ToDictionary(p=>p.Key,p=>p.Value is >=0?p.Value:null)??[];
  var states=row.States?.Where(p=>StateValues.ContainsKey(p.Key)).ToDictionary(p=>p.Key,p=>StateValues[p.Key].Contains(p.Value)?p.Value:"unknown")??[];
  return row with{Version=Regex.IsMatch(row.Version??"",@"^\d{1,4}\.\d{1,4}\.\d{1,4}$")?row.Version!:"unknown",Session=Regex.IsMatch(row.Session??"","^[a-f0-9]{32}$")?row.Session!:"unknown",UptimeMs=Math.Max(0,row.UptimeMs),Trigger=new[]{"periodic","startup","shutdown","user_report","before_reconnect","after_reconnect","before_connect","after_connect"}.Contains(row.Trigger)?row.Trigger:"unknown",Metrics=metrics,States=states};
 }
 private IEnumerable<string> Lines(string file){
  string path=Path.Combine(directory,file);if(!File.Exists(path)||new FileInfo(path).Length>Math.Max(maxBytes+65536,3*1024*1024)||(File.GetAttributes(path)&FileAttributes.ReparsePoint)!=0)yield break;
  using var stream=new FileStream(path,FileMode.Open,FileAccess.Read,FileShare.ReadWrite|FileShare.Delete);using var reader=new StreamReader(stream);while(reader.ReadLine() is string line)if(line.Length<16000)yield return line;
 }
 private static readonly HashSet<string> EventCategories=BuildCategories();
 private static HashSet<string> BuildCategories(){
  var fixedNames=new HashSet<string>{"APP_START_DEMO","APP_START_DISCORD","APP_STOP","MALFORMED_FRAME","NATIVE_DECRYPT_FAILED","DAVE_MLS_REJECTED_USER","DAVE_UNEXPECTED_TRANSITION","VOICE_CONNECTION_INTERRUPTED","OTHER_DISCORD_WARNING","AUDIO_READER_ERROR","CONNECTION_START_FAILED","CONNECTION_START_CANCELLED","CONNECTION_STOP_INCOMPLETE","CONNECTION_STOP_FAILED","RECOVERY_STOP_INCOMPLETE","SOURCE_JS_ERROR","SOURCE_WEBGL_LOST","SOURCE_WEBGL_RESTORED","USER_REPORT_CAPTURED"};
  foreach(var n in Enum.GetNames<AudioLifecycle>())fixedNames.Add("AUDIO_"+n);foreach(var n in Enum.GetNames<AudioRecoveryReason>())fixedNames.Add("AUDIO_RECOVERY_"+n.ToUpperInvariant());return fixedNames;
 }
 private static string? Category(string text){
  if(EventCategories.Contains(text))return text;
  if(Regex.IsMatch(text,"^DAVE_DECRYPT_[A-Za-z_]{1,60}$"))return "DAVE_DECRYPT_ERROR";
  if(Regex.IsMatch(text,@"^VOICE_OPCODE_\d{1,3}$"))return "VOICE_OPCODE_UNKNOWN";
  var source=Regex.Match(text,@"^SOURCE_\d{1,7}_(load|entry|exit|resume)$");return source.Success?"SOURCE_"+source.Groups[1].Value.ToUpperInvariant():null;
 }
 public byte[] Export(ReportContext context){
  events.Record("USER_REPORT_CAPTURED");events.Flush();Capture("user_report");
  lock(gate){var history=new Queue<HealthRow>();var categories=new Queue<object>();bool historyReadFailed=false;
   for(int i=3;i>=0;i--){try{
    foreach(var line in Lines(i==0?"diagnostic-health.jsonl":$"diagnostic-health.{i}.jsonl")){try{var row=JsonSerializer.Deserialize<HealthRow>(line,Json);if(row is not null){history.Enqueue(Clean(row));while(history.Count>480)history.Dequeue();}}catch(JsonException){}}
    foreach(var line in Lines(i==0?"discord-diagnostics.jsonl":$"discord-diagnostics.{i}.jsonl")){try{using var doc=JsonDocument.Parse(line);var e=doc.RootElement;if(e.TryGetProperty("category",out var c)&&c.ValueKind==JsonValueKind.String&&Category(c.GetString()!) is string category&&e.TryGetProperty("count",out var n)&&n.TryGetInt64(out long count)&&count is >=0 and <=1_000_000_000&&e.TryGetProperty("utc",out var t)&&t.TryGetDateTimeOffset(out var utc)){categories.Enqueue(new{utc,category,count});while(categories.Count>600)categories.Dequeue();}}catch(JsonException){}catch(InvalidOperationException){}}
   }catch(Exception e)when(e is IOException or UnauthorizedAccessException){historyReadFailed=true;}}
   string Answer(string? a)=>a is "yes" or "no"?a:"unknown";
   var observations=new{symptom=context.Symptom is "audio_frozen" or "out_of_sync" or "connection"?context.Symptom:"other",discord=Answer(context.Discord),panel=Answer(context.Panel),streamlabs=Answer(context.Streamlabs),affected=context.Affected is "all" or "one"?context.Affected:"unknown"};
   return JsonSerializer.SerializeToUtf8Bytes(new{format=1,version=UpdateService.Version,generatedUtc=DateTimeOffset.UtcNow,privacy="No audio, tokens, Discord IDs/names, configuration, filenames or machine paths. No automatic upload.",observations,logging=new{writeFailed,historyReadFailed,intervalSeconds=15},current=latest,history,categories},new JsonSerializerOptions(Json){WriteIndented=true});
  }
 }
 public void Dispose(){timer.Dispose();lock(gate)disposed=true;}
}
