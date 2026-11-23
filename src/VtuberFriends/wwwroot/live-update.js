const loaded='__UI_VERSION__';
let timer,candidate,busy=false;
document.addEventListener('vf-ui-version',event=>{if(event.detail===loaded)return;candidate=event.detail;clearTimeout(timer);timer=setTimeout(check,1500);});
async function check(){
 if(busy)return;if(globalThis.vfReloadReady?.()===false){timer=setTimeout(check,1000);return;}busy=true;
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),2500);
 try{const r=await fetch('/api/ui-version',{signal:controller.signal,cache:'no-store'});if(!r.ok)return;const {version}=await r.json();
  if(version===candidate&&version!==loaded){const url=new URL(location.href);url.searchParams.set('v',version);location.replace(url.href);}
 }catch{}finally{clearTimeout(timeout);busy=false;}
}
