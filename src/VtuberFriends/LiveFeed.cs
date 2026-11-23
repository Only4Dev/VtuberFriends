using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Threading.Channels;
namespace VtuberFriends;
// A single snapshot/serialization per tick, shared by all browser sources. Slow consumers keep only the latest frame.
public sealed class LiveFeed(Func<object> live, Func<object> diagnostic, AvatarStore avatars, Func<string> version) : IAsyncDisposable
{
 public sealed record Frame(byte[] Live,byte[] Slots,byte[] Diagnostic,byte[] Version);
 private readonly ConcurrentDictionary<Guid,Channel<Frame>> clients=new();
 private readonly CancellationTokenSource stop=new();private Task? pump;
 private static readonly JsonSerializerOptions Json=new(JsonSerializerDefaults.Web);
 public void Start()=>pump=Run();
 private async Task Run(){
  byte[] slots=[],diag=[],ui=[];string uiVersion="";long revision=-1,nextDiagnostic=0,nextFrame=Environment.TickCount64;
  try{while(!stop.IsCancellationRequested){
   if(clients.IsEmpty){await Task.Delay(100,stop.Token);nextFrame=Environment.TickCount64;continue;}
   long current=avatars.Revision;if(current!=revision){slots=Message("slots",avatars.Snapshot());revision=current;}
   if(Environment.TickCount64>=nextDiagnostic){diag=Message("diagnostics",diagnostic());nextDiagnostic=Environment.TickCount64+1000;}
   string currentUi=version();if(currentUi!=uiVersion){uiVersion=currentUi;ui=Message("version",currentUi);}
   var frame=new Frame(Message("levels",live()),slots,diag,ui);
   foreach(var channel in clients.Values)channel.Writer.TryWrite(frame);
   nextFrame+=33;long now=Environment.TickCount64;if(nextFrame<now-33)nextFrame=now;
   await Task.Delay((int)Math.Clamp(nextFrame-now,1,33),stop.Token);
  }}catch(OperationCanceledException){}
 }
 private static byte[] Message(string type,object data)=>Encoding.UTF8.GetBytes("{\"type\":\""+type+"\",\"data\":"+JsonSerializer.Serialize(data,Json)+"}");
 public async Task Serve(HttpContext context){
  if(!context.WebSockets.IsWebSocketRequest){context.Response.StatusCode=400;return;}
  var origin=context.Request.Headers.Origin.ToString();if(origin.Length>0&&origin!=$"http://{context.Request.Host}"){context.Response.StatusCode=403;return;}
  using var socket=await context.WebSockets.AcceptWebSocketAsync();
  using var cancellation=CancellationTokenSource.CreateLinkedTokenSource(context.RequestAborted,stop.Token);
  var channel=Channel.CreateBounded<Frame>(new BoundedChannelOptions(1){SingleReader=true,SingleWriter=true,FullMode=BoundedChannelFullMode.DropOldest});
  var id=Guid.NewGuid();clients[id]=channel;byte[]? slots=null,diag=null,ui=null;
  async Task ReadClose(){try{var buffer=new byte[64];while(!cancellation.IsCancellationRequested){var result=await socket.ReceiveAsync(buffer,cancellation.Token);if(result.MessageType==WebSocketMessageType.Close)break;}}catch(OperationCanceledException){}catch(WebSocketException){}finally{await cancellation.CancelAsync();}}
  var reading=ReadClose();
  try{await foreach(var frame in channel.Reader.ReadAllAsync(cancellation.Token)){
   if(frame.Slots!=slots){await Send(frame.Slots);slots=frame.Slots;}
   if(frame.Diagnostic!=diag){await Send(frame.Diagnostic);diag=frame.Diagnostic;}
   if(frame.Version!=ui){await Send(frame.Version);ui=frame.Version;}
   await Send(frame.Live);
  }}catch(OperationCanceledException){}catch(WebSocketException){}catch(IOException){}finally{clients.TryRemove(id,out _);await cancellation.CancelAsync();await reading;}
  ValueTask Send(byte[] bytes)=>socket.SendAsync(bytes.AsMemory(),WebSocketMessageType.Text,true,cancellation.Token);
 }
 public void Stop(){stop.Cancel();foreach(var c in clients.Values)c.Writer.TryComplete();}
 public async ValueTask DisposeAsync(){Stop();if(pump is not null)await pump;stop.Dispose();}
}
