// Separate from state-stream: minimizing the panel must not shut down the receiver.
let socket,retry,leaving=false;
function connect(){if(leaving)return;const current=new WebSocket(location.origin.replace(/^http/,'ws')+'/api/panel-lifetime');socket=current;
 current.onerror=()=>current.close();current.onclose=()=>{if(!leaving&&socket===current)retry=setTimeout(connect,300);};
}
window.addEventListener('pagehide',()=>{leaving=true;clearTimeout(retry);socket?.close(1000,'panel closed');});
window.addEventListener('pageshow',event=>{if(event.persisted){leaving=false;connect();}});
connect();
