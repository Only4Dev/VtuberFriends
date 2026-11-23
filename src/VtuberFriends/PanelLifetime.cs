using System.Net.WebSockets;
namespace VtuberFriends;
// Only the panel opens this idle lease. Overlay/live sockets never own the desktop application's lifetime.
public sealed class PanelLifetime(IHostApplicationLifetime lifetime) : IAsyncDisposable
{
 private readonly object gate=new();private int panels;private CancellationTokenSource? pending;private Task? pendingTask;
 public async Task Serve(HttpContext context){
  string origin=context.Request.Headers.Origin.ToString();
  if(origin.Length>0&&origin!=$"http://{context.Request.Host}"){context.Response.StatusCode=403;return;}
  if(!context.WebSockets.IsWebSocketRequest){context.Response.StatusCode=400;return;}
  using var socket=await context.WebSockets.AcceptWebSocketAsync();
  using var cancel=CancellationTokenSource.CreateLinkedTokenSource(context.RequestAborted,lifetime.ApplicationStopping);
  lock(gate){pending?.Cancel();panels++;}
  try{
   var buffer=new byte[64];
   while(!cancel.IsCancellationRequested){var result=await socket.ReceiveAsync(buffer,cancel.Token);if(result.MessageType==WebSocketMessageType.Close){await socket.CloseOutputAsync(WebSocketCloseStatus.NormalClosure,"panel closed",cancel.Token);break;}}
  }catch(OperationCanceledException){}catch(WebSocketException){}catch(IOException){}
  finally{lock(gate){panels--;if(panels==0&&!lifetime.ApplicationStopping.IsCancellationRequested){pending?.Cancel();pending=CancellationTokenSource.CreateLinkedTokenSource(lifetime.ApplicationStopping);pendingTask=StopAfterClose(pending);}}}
 }
 private async Task StopAfterClose(CancellationTokenSource closing){
  try{await Task.Delay(2000,closing.Token);bool stop;lock(gate){stop=panels==0&&pending==closing&&!closing.IsCancellationRequested;}if(stop)lifetime.StopApplication();}
  catch(OperationCanceledException){}
  finally{lock(gate){if(pending==closing)pending=null;}closing.Dispose();}
 }
 public async ValueTask DisposeAsync(){Task? wait;lock(gate){pending?.Cancel();wait=pendingTask;}if(wait is not null)await wait;}
}
