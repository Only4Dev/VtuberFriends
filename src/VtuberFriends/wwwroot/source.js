import {sourceDisplay} from '/source-display.js?v=__UI_VERSION__';
import {subscribeState} from '/state-stream.js?v=__UI_VERSION__';
import {SourcePresence} from '/source-presence.js?v=__UI_VERSION__';
import '/live-update.js?v=__UI_VERSION__';
import {mountAvatar,paintAvatar,suspendAvatar} from '/avatar-view.js?v=__UI_VERSION__';
const id=Number(location.pathname.split('/').filter(Boolean).pop());
const preview=new URLSearchParams(location.search).get('preview')==='1';
const view=mountAvatar(document.querySelector('#avatar'));
let previous=null;try{previous=JSON.parse(sessionStorage.getItem('vf.source.'+id)||'null');}catch{}
const presence=new SourcePresence(previous);
function logSource(kind){if(!preview)void fetch('/api/source-events/'+id+'/'+kind,{method:'POST',headers:{'X-VF-Panel':'1'},keepalive:true}).catch(()=>{});}
view.onTransition=logSource;logSource('load');
let latest=null,received=0,savedAt=0,suppressEntry=false,lastTestMode=false;
const knownNames=new Map();
function render(){
 if(!latest)return;
 const slot=latest.slots.find(s=>s.id===id);
 if(!slot){if(view.kind||view.puppet)suspendAvatar(view);view.container.classList.add('is-hidden');return;}
 const fresh=performance.now()-received<1000;
 const {test,connected,person,level,wanted}=sourceDisplay(slot,latest,fresh,knownNames.get(slot.userId));
 const modeChanged=test!==lastTestMode;lastTestMode=test;
 const {instant,resume}=presence.update(connected,wanted,slot.userId);
 if(resume){suppressEntry=true;logSource('resume');}
 if(connected&&!wanted)suppressEntry=false;
 paintAvatar(view,slot,person,level,{preview,fresh,connected,instant:test||modeChanged||instant||suppressEntry,silent:test||modeChanged||!connected});
 if(view.wanted)suppressEntry=false;
 if(connected&&!test&&Date.now()-savedAt>500){
  savedAt=Date.now();
  try{sessionStorage.setItem('vf.source.'+id,JSON.stringify({time:Date.now(),userId:slot.userId,visible:!!wanted}));}catch{}
 }
}
subscribeState(state=>{for(const person of state.participants)knownNames.set(person.userId,person.name);latest=state;received=performance.now();render();},()=>{received=0;render();});
setInterval(render,50);
