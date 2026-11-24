// Independent from the renderer: records only fixed event names and freshness, never errors/URLs/names.
export function monitorSource(id,{send=fetch,clock=()=>performance.now(),target=window,root=document,read=()=>globalThis.vfSourceHealth?.(),every=setInterval,later=setTimeout}={}){
 let lost=false;const last=new Map();
 function report(event){const now=clock();if(last.has(event)&&now-last.get(event)<5000)return;last.set(event,now);const state=read()||{},age=Number.isFinite(state.frameAgeMs)?Math.max(0,Math.min(86400000,state.frameAgeMs)):null;
  void send('/api/diagnostics/source',{method:'POST',headers:{'X-VF-Panel':'1','Content-Type':'application/json'},body:JSON.stringify({sourceId:id,event,frameAgeMs:age,fresh:state.fresh===true,contextLost:lost})}).catch(()=>{});
 }
 target.addEventListener('error',()=>report('js_error'));target.addEventListener('unhandledrejection',()=>report('js_error'));
 root.addEventListener('webglcontextlost',()=>{lost=true;report('context_lost');},true);root.addEventListener('webglcontextrestored',()=>{lost=false;report('context_restored');},true);
 later(()=>report('heartbeat'),1000);every(()=>report('heartbeat'),60000);return {report};
}
if(typeof document!=='undefined'&&/^\/overlay\/\d+$/.test(location.pathname))monitorSource(Number(location.pathname.split('/').pop()));
