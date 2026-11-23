import assert from 'node:assert/strict';
import {setPresence,animationRegistry,registerAnimation} from '../src/VtuberFriends/wwwroot/transitions.js';
const classes=new Set(['is-hidden']);let handles=[];
function makeView(){
 return {container:{classList:{add:n=>classes.add(n),remove:n=>classes.delete(n),toggle(n,on){on?classes.add(n):classes.delete(n);}}},
 actor:{animate(){
  let resolve,reject;
  const finished=new Promise((a,b)=>{resolve=a;reject=b;});
  const handle={finished,finish:resolve,cancel:()=>reject(new Error('cancelled'))};handles.push(handle);return handle;
 }},fx:null};
}
const view=makeView(),slot={userId:'demo-a',entryAnimation:'pop',exitAnimation:'pop',entrySound:'none',exitSound:'none'};
const flush=async()=>{await new Promise(resolve=>setImmediate(resolve));};
setPresence(view,false,slot,{silent:true});assert(classes.has('is-hidden'));assert.equal(handles.length,0);
setPresence(view,true,slot,{silent:true});assert(!classes.has('is-hidden'));assert.equal(handles.length,1);
setPresence(view,true,slot,{silent:true});assert.equal(handles.length,1,'Polling repeats entry');
setPresence(view,false,slot,{silent:true});assert(!classes.has('is-hidden'),'Exit must remain visible while animating');
handles.at(-1).finish();await flush();assert(classes.has('is-hidden'));
setPresence(view,true,slot,{silent:true});setPresence(view,false,slot,{silent:true});setPresence(view,true,slot,{silent:true});
handles.at(-1).finish();await flush();assert(!classes.has('is-hidden'),'Cancelled exit hid reentry');
setPresence(view,false,slot,{instant:true,silent:true});assert(classes.has('is-hidden'));
registerAnimation('future-test',{label:'Future',entry:[],exit:[],duration:0});assert(animationRegistry.has('future-test'));
console.log('PASS: no replay from polling, complete exit, cancelled exit/reentry, immediate disconnect and extensible registry.');
