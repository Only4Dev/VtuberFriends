import assert from 'node:assert/strict';
import {cinematicPresets,sceneState,sceneResources,paintScene,runCinematic} from '../src/VtuberFriends/wwwroot/vfx/cinematic.js';
const kinds=Object.keys(cinematicPresets);
for(const kind of kinds){
 for(const exit of [false,true]){
  let previous=exit?1:0;
  for(let i=0;i<=100;i++){
   const state=sceneState(kind,i/100,exit);assert(Object.values(state).every(Number.isFinite));
   assert(state.reveal>=0&&state.reveal<=1&&state.envelope>=0&&state.envelope<=1);
   assert(exit?state.reveal<=previous+1e-9:state.reveal>=previous-1e-9);previous=state.reveal;
  }
  assert.equal(sceneState(kind,0,exit).reveal,exit?1:0);assert.equal(sceneState(kind,1,exit).reveal,exit?0:1);
 }
}
assert.deepEqual(sceneResources(71),sceneResources(71),'Scene must be deterministic');
assert(sceneResources(71,'high').particles.length<=120);assert(sceneResources(71,'low').particles.length<sceneResources(71,'medium').particles.length);
let calls=0;
function context(){return new Proxy({globalAlpha:1},{get(target,key){if(key in target)return target[key];return (...args)=>{calls++;if(key==='createImageData')return {data:new Uint8ClampedArray(args[0]*args[1]*4)};if(String(key).startsWith('create'))return {addColorStop(){}};};},set(target,key,value){target[key]=value;return true;}});}
for(const kind of kinds)for(const exit of [false,true])for(let i=0;i<=20;i++)paintScene(kind,context(),context(),sceneState(kind,i/20,exit),sceneResources(cinematicPresets[kind].seed),exit,.8);
assert(calls>1000,'Every procedural painter must exercise its drawing paths');
const raf=new Map();let rafId=0,timerId=0;const timers=new Map();
globalThis.performance={now:()=>0};globalThis.requestAnimationFrame=cb=>{raf.set(++rafId,cb);return rafId;};globalThis.cancelAnimationFrame=id=>raf.delete(id);
globalThis.setTimeout=cb=>{timers.set(++timerId,cb);return timerId;};globalThis.clearTimeout=id=>timers.delete(id);
let live=0;
globalThis.document={createElement(){let attached=false;return {setAttribute(){},getContext:context,remove(){if(attached){live--;attached=false;}},attach(){attached=true;live++;}};}};
function makeView(){return {fx:{append(c){c.attach();}},fxFront:{append(c){c.attach();}},actor:{},body:{style:{}},name:{style:{visibility:''}},puppet:{setMaterialization(value,color,active=true){this.reveal=value;this.materializing=active;}}};}
for(const kind of kinds){
 const view=makeView(),job=runCinematic(view,kind,false,3000,{},()=>Promise.resolve());
 assert.equal(live,2);assert.equal(view.puppet.reveal,0);
 const [id,cb]=raf.entries().next().value;raf.delete(id);cb(1500);assert(view.puppet.reveal>=0&&view.puppet.reveal<=1);
 view.stopCinematic();await job;assert.equal(live,0);assert.equal(raf.size,0);assert.equal(timers.size,0);assert.equal(view.puppet.reveal,1);assert.equal(view.puppet.materializing,false);assert.equal(view.name.style.visibility,'');
 const end=runCinematic(view,kind,true,3000,{},()=>Promise.resolve());
 const [last,lastCb]=raf.entries().next().value;raf.delete(last);lastCb(3001);await end;
 assert.equal(live,0);assert.equal(raf.size,0);assert.equal(timers.size,0);
}
console.log('PASS: four entry/exit timelines, deterministic bounded effects, drawing commands, reveal, cancellation, completion and resource cleanup. Canvas stub, not visual/GPU validation.');

const {setPresence}=await import('../src/VtuberFriends/wwwroot/transitions.js');
for(const kind of kinds){
 const view=makeView(),classes=new Set(['is-hidden']),animations=[];
 view.container={classList:{add:n=>classes.add(n),remove:n=>classes.delete(n),toggle(n,on){on?classes.add(n):classes.delete(n);}}};
 view.fx.replaceChildren=()=>{};view.fxFront.replaceChildren=()=>{};
 view.actor.animate=()=>{let finish,reject;const finished=new Promise((a,b)=>{finish=a;reject=b;});const animation={finished,finish,cancel(){reject(Error('cancelled'));}};animations.push(animation);return animation;};
 const slot={userId:'demo-a',entryAnimation:kind,exitAnimation:kind};
 setPresence(view,false,slot,{instant:true,silent:true});setPresence(view,true,slot,{silent:true});
 setPresence(view,false,slot,{silent:true});setPresence(view,true,slot,{silent:true});
 assert.equal(live,2);assert.equal(raf.size,1);assert.equal(timers.size,1);
 const [id,frame]=raf.entries().next().value;raf.delete(id);frame(10000);animations.at(-1).finish();
 await new Promise(resolve=>setImmediate(resolve));assert(!classes.has('is-hidden'),'Cancelled cinematic exit hid a new entry');
 setPresence(view,false,slot,{instant:true,silent:true});assert.equal(live,0);assert.equal(raf.size,0);assert.equal(timers.size,0);
}
console.log('PASS: cinematic presence exit/reentry cancels prior scenes and keeps the new avatar visible.');
