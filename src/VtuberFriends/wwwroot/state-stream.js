// One shared 30 Hz server snapshot. WebSockets avoid the browser's six HTTP/SSE connection limit.
export function subscribeState(update,offline,{panel=false}={}){
 const state={testMode:false,receiver:{},slots:[],users:[],participants:[]};let source,stopped=false,retry,delay=500;
 function open(){if(stopped||panel&&document.hidden)return;const socket=new WebSocket(location.origin.replace(/^http/,'ws')+'/api/live');source=socket;
  socket.onopen=()=>{delay=500;};socket.onmessage=event=>{if(source!==socket)return;const {type,data}=JSON.parse(event.data);
   if(type==='version')document.dispatchEvent(new CustomEvent('vf-ui-version',{detail:data}));
   else if(type==='slots')state.slots=data;
   else if(type==='diagnostics')state.receiver={...state.receiver,...data};
   else if(type==='levels'){state.testMode=data.testMode===true;state.receiver={...state.receiver,...data.receiver};state.users=data.users;state.participants=data.participants;update(state);}
  };
  socket.onerror=()=>socket.close();socket.onclose=()=>{if(source!==socket)return;offline();if(!stopped&&!(panel&&document.hidden)){retry=setTimeout(open,delay);delay=Math.min(3000,delay*2);}};
 }
 function visibility(){if(!panel)return;clearTimeout(retry);const old=source;source=null;old?.close();if(document.hidden)offline();else open();}
 document.addEventListener('visibilitychange',visibility);open();
 return ()=>{stopped=true;clearTimeout(retry);source?.close();document.removeEventListener('visibilitychange',visibility);};
}
