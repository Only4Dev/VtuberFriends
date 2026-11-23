import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {addAccessories,validateAccessories} from '../src/VtuberFriends/wwwroot/puppet/accessories.js';
import {PuppetRig} from '../src/VtuberFriends/wwwroot/puppet/rig.js';
import {fitRigView,meshPoint} from '../src/VtuberFriends/wwwroot/puppet/framing.js';
import {P,ParameterNames} from '../src/VtuberFriends/wwwroot/puppet/controllers.js';
const manifest=JSON.parse(await readFile(new URL('../src/VtuberFriends/wwwroot/puppets/cyan-dragon/rig.json',import.meta.url),'utf8'));
const catalog=validateAccessories(JSON.parse(await readFile(new URL('../src/VtuberFriends/wwwroot/accessories/catalog.json',import.meta.url),'utf8')));
assert.equal(addAccessories(manifest,catalog).size,catalog.length+catalog.filter(a=>a.category==='accessoryObject').length);
const rig=new PuppetRig(manifest),values=new Float32Array(ParameterNames.length);
rig.update(values,{});assert(rig.parts.filter(p=>p.definition.accessory).every(p=>p.alpha===0));
const settings={padding:120,accessoryGlasses:'round',accessoryHat:'wizard',accessoryNecklace:'gem',parts:{head:{x:20,y:-30,rotation:4}}};
rig.update(values,settings);
const chosen=rig.parts.filter(p=>p.definition.accessory&&p.alpha===1);assert.equal(chosen.length,3);
const collar=chosen.find(p=>p.definition.node==='torso'),base=[...collar.matrix];
for(const angle of [-15,15]){
 values[P.HeadAngleZ]=angle;values[P.HeadAngleX]=angle;values[P.Breath]=.5;rig.update(values,settings);
 for(const p of chosen.filter(p=>p.definition.node==='head'))assert.deepEqual(p.accessoryBase,rig.parts.find(p=>p.definition.id==='head').matrix,'Headwear must follow head including edits');
 assert.deepEqual(collar.accessoryBase,rig.parts.find(p=>p.definition.id==='torso').matrix,'Collar follows torso');
 const box=fitRigView(rig);for(const part of chosen)for(let y=0;y<=8;y++)for(let x=0;x<=8;x++){
  const p=meshPoint(part,x/8,y/8,rig);assert(p[0]>=box[0]&&p[0]<=box[0]+box[2]&&p[1]>=box[1]&&p[1]<=box[1]+box[3]);
 }
}
values[P.Breath]=0;rig.update(values,settings);assert.deepEqual([...collar.matrix],base,'Head rotation must not rotate collar');
rig.update(values,{});assert(rig.parts.filter(p=>p.definition.accessory).every(p=>p.alpha===0));
console.log('PASS: accessories default off, independent combinations, head/torso attachment including edits, camera containment and removal. CPU validation.');

const objectSettings={...settings,accessoryObject:'microphone',objectAnimation:'sway',objectAmplitude:.8,objectSpeed:1,time:0,accessoryEdits:{'cyan-dragon:object-microphone':{x:-120,y:50,scale:1.2,rotation:-15}}};
rig.update(values,objectSettings);const object=rig.parts.find(p=>p.definition.accessory?.id==='object-microphone'),first=[...object.matrix];
objectSettings.time=1;rig.update(values,objectSettings);assert.notDeepEqual([...object.matrix],first,'Object must animate independently');
objectSettings.objectAnimation='none';rig.update(values,objectSettings);const still=[...object.matrix];objectSettings.time=3;rig.update(values,objectSettings);assert.deepEqual([...object.matrix],still);
const {dragAccessoryDelta}=await import('../src/VtuberFriends/wwwroot/puppet/accessory-editor.js');
const rotated=new Float32Array([0,2,0,-2,0,0,0,0,1]);const delta=dragAccessoryDelta(rotated,20,0);assert.equal(delta[0],0);assert.equal(delta[1],-10);
assert.throws(()=>validateAccessories([{...catalog[0],file:'../../token.svg'}]));
assert.throws(()=>validateAccessories([catalog[0],catalog[0]]));
for(const item of catalog){const source=await readFile(new URL('../src/VtuberFriends/wwwroot/accessories/'+item.file,import.meta.url),'utf8');assert(source.includes('<svg'));}
console.log('PASS: file catalogue validation, object idle/off, per-Puppet transforms and drag under rotated/scaled parent.');

const {PuppetAvatar}=await import('../src/VtuberFriends/wwwroot/puppet/player.js');
const snapshots=[];const frozen={restPreview:true,previewObjectMotion:false,input:{},settings:{},clock:0,behavior:{clearOverride(){},update(){throw Error('Rest preview must not run spontaneous controllers');}},rig:{update(p,s){snapshots.push({p:[...p],time:s.time});}},renderer:{draw(){},lost:false},frameCount:0};
PuppetAvatar.prototype.frame.call(frozen,.05);PuppetAvatar.prototype.frame.call(frozen,.05);
assert.deepEqual(snapshots[0],snapshots[1]);assert.equal(snapshots[0].p[P.HeadAngleZ],0);assert.equal(snapshots[0].p[P.EyeOpenLeft],1);
frozen.previewObjectMotion=true;PuppetAvatar.prototype.frame.call(frozen,.05);assert(snapshots[2].time>0);assert.deepEqual(snapshots[2].p,snapshots[0].p);
console.log('PASS: editor rests with eyes open; optional object motion does not animate Puppet.');

const both={...objectSettings,accessoryObjectLeft:'microphone',objectLeftAnimation:'none',objectLeftAmplitude:.3,objectLeftSpeed:2,objectAnimation:'sway',time:0,accessoryEdits:{...objectSettings.accessoryEdits,'cyan-dragon:object-microphone-left':{x:35,y:-25,scale:.8,rotation:20}}};
rig.update(values,both);const leftObject=rig.parts.find(p=>p.definition.accessory?.id==='object-microphone-left');assert.equal(leftObject.alpha,1);assert.equal(object.alpha,1);const leftBefore=[...leftObject.matrix],rightBefore=[...object.matrix];
both.time=1;rig.update(values,both);assert.deepEqual([...leftObject.matrix],leftBefore);assert.notDeepEqual([...object.matrix],rightBefore);
assert(leftObject.definition.rect[0]<768);assert(object.definition.rect[0]>768);
both.accessoryObject='none';rig.update(values,both);assert.equal(object.alpha,0);assert.equal(leftObject.alpha,1);
console.log('PASS: two simultaneous microphones, mirrored defaults, separate adjustments/idle and independent removal; legacy right identity preserved.');

for(const pack of ['cyan-dragon','jade-dragon','rose-dragon','frost-dragon']){
 const m=JSON.parse(await readFile(new URL('../src/VtuberFriends/wwwroot/puppets/'+pack+'/rig.json',import.meta.url),'utf8'));addAccessories(m,catalog);const r=new PuppetRig(m);
 r.update(values,{padding:120,accessoryAura:'energy',accessoryFloor:'smoke',accessoryLightning:'storm',accessoryEffect:'nose-smoke',accessoryEdits:{[pack+':effect-aura']:{x:130,y:-100,scale:1.4}}});
 const box=fitRigView(r),fx=r.parts.filter(p=>p.alpha>0&&p.definition.accessory?.fx);assert.equal(fx.length,4);assert.equal(r.parts[0].definition.accessory.fx,'aura');
 for(const part of fx)for(let y=0;y<=8;y++)for(let x=0;x<=8;x++){const p=meshPoint(part,x/8,y/8,r);assert(p[0]>=box[0]&&p[0]<=box[0]+box[2]&&p[1]>=box[1]&&p[1]<=box[1]+box[3]);}
}
frozen.previewObjectMotion=false;frozen.previewEffects=true;PuppetAvatar.prototype.frame.call(frozen,.05);assert(frozen.settings.time>0);assert.equal(frozen.settings.objectTime,0);
console.log('PASS: four effects contained for tall/wide rigs, back/front layer order and effect clock in static editor without object idle.');
