import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PuppetRig} from '../src/VtuberFriends/wwwroot/puppet/rig.js';
import {PuppetRenderer} from '../src/VtuberFriends/wwwroot/puppet/renderer.js';
import {P,ParameterNames} from '../src/VtuberFriends/wwwroot/puppet/controllers.js';
import {suspendAvatar} from '../src/VtuberFriends/wwwroot/avatar-view.js';
const manifest=JSON.parse(await readFile(new URL('../src/VtuberFriends/wwwroot/puppets/cyan-dragon/rig.json',import.meta.url),'utf8'));
const rig=new PuppetRig(manifest),pose=new Float32Array(ParameterNames.length);pose[P.MouthWidth]=1;pose[P.EyeOpenLeft]=pose[P.EyeOpenRight]=1;
const uniform=new Map(),draws=[];
const gl=new Proxy({}, {get(target,key){
 if(key==='getShaderParameter'||key==='getProgramParameter')return ()=>true;
 if(key==='getUniformLocation')return (p,name)=>name;
 if(key==='uniform1f')return (name,value)=>uniform.set(name,value);
 if(key==='drawArrays')return ()=>draws.push({pass:uniform.get('uGlowPass'),kind:uniform.get('uGlowKind'),strength:uniform.get('uGlowStrength'),lashFit:uniform.get('uLashFit'),eyeClip:uniform.get('uEyeClip'),shiny:uniform.get('uJadeShiny'),prop:uniform.get('uPropKind')});
 if(String(key).startsWith('create'))return ()=>({});
 if(String(key).toUpperCase()===key)return 1;
 return ()=>{};
}});
const canvas={width:1536,height:1024,getContext:()=>gl,addEventListener(){},removeEventListener(){}};
const renderer=new PuppetRenderer(canvas,rig,new Map());
rig.update(pose,{});renderer.draw();const normal=draws.length;assert.equal(normal,rig.parts.filter(p=>p.alpha>.001).length,'Disabled glow must have no extra draw passes');
draws.length=0;rig.update(pose,{eyeGlow:.4,patternGlow:.3});renderer.draw();assert.equal(draws.filter(d=>d.pass&&d.kind===1).length,2);assert.equal(draws.filter(d=>d.pass&&d.kind===2).length,4);
pose[P.EyeOpenLeft]=pose[P.EyeOpenRight]=0;draws.length=0;rig.update(pose,{eyeGlow:.4,patternGlow:0});renderer.draw();assert.equal(draws.filter(d=>d.pass).length,0,'Closed lids must suppress eye emission');renderer.dispose();
let disposed=false,released=false,cleared=false,cancelled=false;
const view={wanted:true,kind:'cyan-puppet',until:99,transitionSerial:1,animations:[{cancel(){cancelled=true;}}],body:{replaceChildren(){cleared=true;}},container:{classList:{add(){}}},puppet:{dispose(){disposed=true;}},ambient:{release(){released=true;}}};
suspendAvatar(view);assert(disposed&&released&&cleared&&cancelled);assert.equal(view.puppet,null);assert.equal(view.kind,null);assert.equal(view.wanted,false);
console.log('PASS: selective glow passes, disabled glow cost, blink suppression, panel preview resource disposal. WebGL stub; not shader compilation.');

const jadeManifest=JSON.parse(await readFile(new URL('../src/VtuberFriends/wwwroot/puppets/jade-dragon/rig.json',import.meta.url),'utf8'));
const jadeRig=new PuppetRig(jadeManifest),jadeRenderer=new PuppetRenderer(canvas,jadeRig,new Map());
jadeRig.update(pose,{time:2,idle:.6,eyeGlow:.3,patternGlow:.2});jadeRenderer.draw();
assert(jadeRenderer.resources.filter(r=>r.eyeToHead).length>=8,'Jade eye layers must use head-alpha clipping');
for(const r of jadeRenderer.resources.filter(r=>r.eyeToHead))assert([...r.eyeToHead].every(Number.isFinite));
assert.equal(jadeRenderer.vertexCount,24*24*6);jadeRenderer.dispose();
console.log('PASS: Jade eye-mask draw path, finite eye/head transforms, 24x24 body geometry and disposal. WebGL stub, not GPU compilation.');

const amberManifest=JSON.parse(await readFile(new URL('../src/VtuberFriends/wwwroot/puppets/amber-dragon/rig.json',import.meta.url),'utf8'));
const amberRig=new PuppetRig(amberManifest),amberRenderer=new PuppetRenderer(canvas,amberRig,new Map());pose[P.MouthOpen]=pose[P.JawOffset]=.8;amberRig.update(pose,{mouthTravel:70});amberRenderer.draw();
assert.equal(amberRenderer.resources.filter(r=>r.part.definition.deform==='surfaceFangs').length,2);assert.equal(amberRenderer.resources.filter(r=>r.part.definition.deform==='surfaceMouth').length,1);assert(amberRenderer.resources.filter(r=>r.eyeToHead).every(r=>[...r.eyeToHead].every(Number.isFinite)));amberRenderer.dispose();
console.log('PASS: Amber surface-mouth/fangs and eye masks draw/dispose without legacy jaw data. WebGL stub, not GPU validation.');

const thoxerManifest=JSON.parse(await readFile(new URL('../src/VtuberFriends/wwwroot/puppets/thoxer-dragon/rig.json',import.meta.url),'utf8'));
const thoxerRig=new PuppetRig(thoxerManifest),thoxerRenderer=new PuppetRenderer(canvas,thoxerRig,new Map());
draws.length=0;thoxerRig.update(pose,{time:0,cyberGlow:.35});thoxerRenderer.draw();const initial=draws.filter(d=>d.kind===3&&d.pass);assert.equal(initial.length,6);
draws.length=0;thoxerRig.update(pose,{time:2.4,cyberGlow:.35});thoxerRenderer.draw();const peak=draws.filter(d=>d.kind===3&&d.pass);assert(peak.every(d=>d.strength>initial[0].strength));
draws.length=0;thoxerRig.update(pose,{time:3,cyberGlow:0});thoxerRenderer.draw();assert(!draws.some(d=>d.kind===3&&d.pass));thoxerRenderer.dispose();
console.log('PASS: Thoxer six selective pulsing emissive passes, intensity/off and cleanup. WebGL stub, not GPU validation.');

const patchManifest=JSON.parse(await readFile(new URL('../src/VtuberFriends/wwwroot/puppets/patch-dragon/rig.json',import.meta.url),'utf8'));
const patchRig=new PuppetRig(patchManifest),patchRenderer=new PuppetRenderer(canvas,patchRig,new Map());
patchRig.update(pose,{mouthTravel:70});patchRenderer.draw();assert.equal(uniform.get('uSurfaceSmile'),30);
assert(patchRenderer.resources.some(r=>r.part.definition.id==='bandana'));patchRenderer.dispose();
const legacyRig=new PuppetRig(amberManifest),legacyRenderer=new PuppetRenderer(canvas,legacyRig,new Map());legacyRig.update(pose,{});legacyRenderer.draw();assert.equal(uniform.get('uSurfaceSmile'),12);legacyRenderer.dispose();
console.log('PASS: Remiendo cloth scarf resource and per-model smile uniform; legacy smile unchanged. WebGL stub, not GPU validation.');

const roseManifest=JSON.parse(await readFile(new URL('../src/VtuberFriends/wwwroot/puppets/rose-dragon/rig.json',import.meta.url),'utf8'));
const roseRig=new PuppetRig(roseManifest),roseRenderer=new PuppetRenderer(canvas,roseRig,new Map());
draws.length=0;roseRig.update(pose,{time:1.7,mouthTravel:70,idle:1});roseRenderer.draw();
assert.equal(uniform.get('uSurfaceSlant'),-22);assert.equal(uniform.get('uSparkleTime'),1.7);
assert.equal(roseRenderer.resources.filter(r=>r.part.definition.sparkles).length,2);
assert.equal(draws.filter(d=>d.lashFit===1&&d.eyeClip===-1).length,2,'Both upper lashes must fit contour and exclude eye opening');assert.equal(draws.length,roseManifest.parts.length,'No extra particle or glow passes');roseRenderer.dispose();
console.log('PASS: Rosalia sparkle resources/clock, tilted surface-mouth uniform and disposal. WebGL stub, not GPU validation.');

const frostManifest=JSON.parse(await readFile(new URL('../src/VtuberFriends/wwwroot/puppets/frost-dragon/rig.json',import.meta.url),'utf8'));
const frostRig=new PuppetRig(frostManifest),frostRenderer=new PuppetRenderer(canvas,frostRig,new Map());
draws.length=0;frostRig.update(pose,{mouthTravel:70});frostRenderer.draw();assert.equal(uniform.get('uSurfaceSlant'),-60);
assert.equal(draws.length,frostManifest.parts.length);assert(frostRenderer.resources.filter(r=>r.eyeToHead).length>=8);frostRenderer.dispose();
console.log('PASS: Boreal asymmetric pack draw path, eye masks, surface smirk and disposal. WebGL stub, not GPU validation.');

const shinyRig=new PuppetRig(jadeManifest),shinyRenderer=new PuppetRenderer(canvas,shinyRig,new Map());
draws.length=0;shinyRig.update(pose,{jadeShiny:true,patternGlow:.2});shinyRenderer.draw();
assert.equal(draws.filter(d=>d.shiny===1).length,shinyRig.parts.filter(p=>p.alpha>.001&&p.definition.src&&!p.definition.accessory).length);
assert(!draws.some(d=>d.pass&&d.shiny),'Preserve original gold/eye emission');
draws.length=0;shinyRig.update(pose,{jadeShiny:false});shinyRenderer.draw();assert(!draws.some(d=>d.shiny));shinyRenderer.dispose();
console.log('PASS: Jade shiny normal-texture palette passes, original glow masks, reversible off and disposal. WebGL stub, not GPU validation.');

const {addAccessories}=await import('../src/VtuberFriends/wwwroot/puppet/accessories.js');
const propManifest=structuredClone(manifest),catalog=JSON.parse(await readFile(new URL('../src/VtuberFriends/wwwroot/accessories/catalog.json',import.meta.url),'utf8'));addAccessories(propManifest,catalog);
const propRig=new PuppetRig(propManifest),propRenderer=new PuppetRenderer(canvas,propRig,new Map());
draws.length=0;propRig.update(pose,{time:5,accessoryAura:'energy',accessoryFloor:'smoke',accessoryLightning:'storm',accessoryEffect:'nose-smoke',accessoryObject:'phone',accessoryObjectLeft:'galaxy'});propRenderer.draw();assert.deepEqual(draws.filter(d=>d.prop).map(d=>d.prop).sort(),[1,2,3,4,5,6]);
draws.length=0;propRig.update(pose,{});propRenderer.draw();assert.equal(draws.filter(d=>d.prop).length,0);propRenderer.dispose();
console.log('PASS: six procedural effect types bound once each, no draws when disabled, shared renderer disposal. WebGL stub, not visual validation.');

const lazyRig=new PuppetRig(structuredClone(propManifest)),lazyImages=new Map();let loads=0,resolveImage;lazyImages.load=()=>{loads++;return new Promise(resolve=>{resolveImage=resolve;});};
const lazyRenderer=new PuppetRenderer(canvas,lazyRig,lazyImages);lazyRig.update(pose,{});lazyRenderer.draw();assert.equal(loads,0);assert(lazyRenderer.resources.filter(r=>r.part.definition.accessory).every(r=>r.texture===null));
lazyRig.update(pose,{accessoryObject:'phone'});lazyRenderer.draw();assert.equal(loads,1);lazyRenderer.draw();assert.equal(loads,1,'No duplicate image loads while pending');const phone=lazyRenderer.resources.find(r=>r.part.definition.accessory?.id==='object-phone');resolveImage({});await new Promise(resolve=>setTimeout(resolve,0));assert(phone.texture);assert(lazyRenderer.resources.filter(r=>r.part.definition.accessory&&r!==phone).every(r=>r.texture===null));lazyRenderer.dispose();
console.log('PASS: no accessory decode/upload while off, first selection loads once and leaves all unselected textures unallocated. Stub only.');
