import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PuppetRig} from '../src/VtuberFriends/wwwroot/puppet/rig.js';
import {P,ParameterNames} from '../src/VtuberFriends/wwwroot/puppet/controllers.js';
import {surfaceEdges,surfacePoint} from '../src/VtuberFriends/wwwroot/puppet/surface-mouth.js';
import {fitRigView,meshPoint} from '../src/VtuberFriends/wwwroot/puppet/framing.js';
import {sparklePulse,packSparkles} from '../src/VtuberFriends/wwwroot/puppet/sparkles.js';
import {puppetPacks} from '../src/VtuberFriends/wwwroot/puppet/packs.js';
import {switchAccessoryAvatar} from '../src/VtuberFriends/wwwroot/puppet/accessory-profiles.js';
const m=JSON.parse(await readFile(new URL('../src/VtuberFriends/wwwroot/puppets/rose-dragon/rig.json',import.meta.url),'utf8'));
assert.equal(puppetPacks['rose-puppet'].id,m.id);assert(!m.parts.some(p=>p.id==='jaw'));
const index=id=>m.parts.findIndex(p=>p.id===id);
assert(m.integratedForelock&&!m.parts.some(p=>p.id==='forelock'),'Crown and forelock are part of scalp, not floating pieces');
const approved=JSON.parse(await readFile(new URL('./fixtures/rose-wings-mouth-v1.json',import.meta.url),'utf8'));
assert.deepEqual(m.parts.filter(p=>['wing-left','wing-right','sparkles-left','sparkles-right'].includes(p.id)),approved.parts,'Preserve approved wings and glints');
for(const key of ['surfaceMouth','surfaceSmile','surfaceSlant'])assert.deepEqual(m[key],approved[key]);
assert(m.parts.find(p=>p.id==='torso').rect[2]>=580);assert(m.hairMotionScale<=.3);

for(const side of ['left','right']){
 assert(index('head')<index('eye-bg-'+side)&&index('eye-bg-'+side)<index('eye-'+side)&&index('eye-'+side)<index('lashes-'+side),'Eye must be above integrated front hair and lashes above eye');
 assert(m.eyeBounds[side][3]-m.eyeBounds[side][1]<=65,'Keep half-lidded aperture');
 assert.equal(m.parts[index('eye-bg-'+side)].node,'head');
 assert.notEqual(m.parts[index('eye-bg-'+side)].src,m.parts[index('eye-'+side)].src);
 assert.equal(m.nodes.find(n=>n.id==='antenna-'+side).parent,'head');
}
const rig=new PuppetRig(m),v=new Float32Array(ParameterNames.length);v[P.EyeOpenLeft]=v[P.EyeOpenRight]=v[P.MouthWidth]=1;
const get=id=>rig.parts.find(p=>p.definition.id===id);
rig.update(v,{time:0,idle:1});const initial=Array.from(get('antenna-left').matrix);
rig.update(v,{time:2,idle:1});assert.notDeepEqual(Array.from(get('antenna-left').matrix),initial);
rig.update(v,{time:0,idle:0});const stopped=Array.from(get('antenna-left').matrix);rig.update(v,{time:2,idle:0});assert.deepEqual(Array.from(get('antenna-left').matrix),stopped);
assert(surfaceEdges(1,m.surfaceMouth,0,70,0,m.surfaceSmile,m.surfaceSlant)[0]<surfaceEdges(0,m.surfaceMouth,0,70,0,m.surfaceSmile,m.surfaceSlant)[0],'Right corner of smirk is raised');
for(const time of [0,1.5,4])for(const open of [0,.5,1]){
 v[P.MouthOpen]=open;v[P.HeadAngleZ]=Math.sin(time)*12;v[P.WingLeftTip]=8;v[P.WingRightTip]=-8;rig.update(v,{time,idle:1,padding:120,mouthTravel:70});
 const box=fitRigView(rig);
 for(const p of rig.parts)for(let y=0;y<=24;y++)for(let x=0;x<=24;x++){
  const q=meshPoint(p,x/24,y/24,rig);assert(q.every(Number.isFinite));assert(q[0]>=box[0]-.01&&q[0]<=box[0]+box[2]+.01&&q[1]>=box[1]-.01&&q[1]<=box[1]+box[3]+.01);
 }
 for(const side of ['left','right'])for(const [u,w]of [[0,0],[.3,.6],[1,1]])assert.deepEqual(meshPoint(get('wing-'+side),u,w,rig),meshPoint(get('sparkles-'+side),u,w,rig),'Stars must deform exactly with wing');
 for(const fang of m.parts.filter(p=>p.deform==='surfaceFangs')){
  const [x,y]=fang.rect,t=(x-m.surfaceMouth[0])/m.surfaceMouth[2],base=surfaceEdges(t,m.surfaceMouth,0,70,0,m.surfaceSmile,m.surfaceSlant),now=surfaceEdges(t,m.surfaceMouth,open,70,0,m.surfaceSmile,m.surfaceSlant);
  assert(Math.abs(surfacePoint(x,y,0,0,3,rig)[1]-(y+now[0]-base[0]))<1e-6);
 }
}
assert(sparklePulse(0,0)!==sparklePulse(1,0));assert.equal(packSparkles(m.parts[index('sparkles-left')].sparkles).length,32);
assert.throws(()=>new PuppetRig({...m,surfaceSlant:NaN}));
const bad=structuredClone(m);bad.parts[index('sparkles-left')].sparkles[0][2]=-1;assert.throws(()=>new PuppetRig(bad));
const slot={avatar:'patch-puppet',accessoryGlasses:'round'};switchAccessoryAvatar(slot,'rose-puppet');assert.equal(slot.accessoryGlasses,'none');switchAccessoryAvatar(slot,'patch-puppet');assert.equal(slot.accessoryGlasses,'round');
console.log('PASS: Rosalia eye-over-hair/lashes, separate pupils/backgrounds, idle antennae, asymmetric mouth/attached fangs, wing-local twinkles, framing and isolated accessories. CPU validation.');
