import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {ambientRegistry,ambientPool,paintAmbient,AmbientLayer,ambientViewport} from '../src/VtuberFriends/wwwroot/vfx/ambient.js';
import {projectAnchor} from '../src/VtuberFriends/wwwroot/puppet/anchors.js';
import {PuppetRig} from '../src/VtuberFriends/wwwroot/puppet/rig.js';
import {P,ParameterNames} from '../src/VtuberFriends/wwwroot/puppet/controllers.js';
const manifest=JSON.parse(await readFile(new URL('../src/VtuberFriends/wwwroot/puppets/cyan-dragon/rig.json',import.meta.url),'utf8')),rig=new PuppetRig(manifest),pose=new Float32Array(ParameterNames.length);pose[P.MouthWidth]=1;
rig.update(pose);const mouth=projectAnchor(rig,'mouth'),left=projectAnchor(rig,'hornLeft');pose[P.HeadAngleZ]=12;pose[P.MouthOpen]=.8;rig.update(pose);const turned=projectAnchor(rig,'hornLeft');
assert(Math.abs(turned.y-left.y)>.01,'Horn anchor must follow head tilt');assert(Number.isFinite(projectAnchor(rig,'mouth').x));assert(mouth.x>0&&mouth.x<1);assert.equal(projectAnchor(rig,'missing'),null);
assert.deepEqual(ambientPool(7),ambientPool(7));assert.equal(ambientPool().length,48);
const anchors={center:{x:200,y:150},body:{x:200,y:210},radius:90,hornLeft:{x:155,y:75},hornRight:{x:245,y:75}};
let calls=0;
function context(){return new Proxy({globalAlpha:1},{get(target,key){if(key in target)return target[key];return ()=>{calls++;if(String(key).startsWith('create'))return {addColorStop(){}};};},set(target,key,value){target[key]=value;return true;}});}
for(const effect of Object.keys(ambientRegistry))for(const t of [.2,1,3,8])paintAmbient(context(),context(),t,anchors,{effects:[effect],quality:'high',size:1,color:'#86d8ef'},ambientPool());
assert(calls>1000);
let nodes=0,id=0;const raf=new Map();globalThis.requestAnimationFrame=cb=>{raf.set(++id,cb);return id;};globalThis.cancelAnimationFrame=i=>raf.delete(i);
globalThis.document={hidden:false,createElement(){let attached=false;return {classList:{add(){}},setAttribute(){},getContext:context,attach(){attached=true;nodes++;},remove(){if(attached){attached=false;nodes--;}}};}};
const view={container:{},actor:{append(node){node.attach();},getBoundingClientRect(){return {left:0,top:0,width:400,height:300};}},body:{getBoundingClientRect(){return {left:50,top:60,width:300,height:200};}},animations:[]};
const layer=new AmbientLayer(view),slot={ambientEffects:['runes','orbs'],ambientQuality:'medium'};
layer.update(slot,false);assert.equal(nodes,0);layer.update(slot,true);assert.equal(nodes,2);assert.equal(raf.size,1);
const [frameId,frame]=raf.entries().next().value;raf.delete(frameId);frame(17);
layer.update({...slot,ambientQuality:'low'},true);assert.equal(nodes,2,'Quality change must release old canvases');
view.stopCinematic=()=>{};layer.frame(.05);view.stopCinematic=null;
layer.update({...slot,ambientEffects:[]},true);assert.equal(nodes,0);assert.equal(raf.size,0);
layer.update(slot,true);layer.update(slot,false);assert.equal(nodes,0);assert.equal(raf.size,0);layer.dispose();
console.log('PASS: four decoration painters, deterministic bounded pool, moving rig anchors, enable/disable, quality replacement and cleanup. Canvas stub; no GPU claim.');

assert(!('arcs' in ambientRegistry));
for(const size of [.5,1,1.5])for(const radius of [40,100,180])for(const center of [{x:200,y:150},{x:110,y:80},{x:280,y:230}]){
 const a={...anchors,center,body:{x:center.x+10,y:center.y+60},radius};
 const bounds=ambientViewport(a,{effects:Object.keys(ambientRegistry),size}).bounds;
 assert(bounds[0]>=7.999&&bounds[1]>=7.999&&bounds[2]<=392.001&&bounds[3]<=292.001,'Decoration envelope must fit including halo');
}
console.log('PASS: removed arcs and full-orbit automatic fit including glow extents.');
