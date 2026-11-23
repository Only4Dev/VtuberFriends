import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PuppetRig} from '../src/VtuberFriends/wwwroot/puppet/rig.js';
import {P,ParameterNames} from '../src/VtuberFriends/wwwroot/puppet/controllers.js';
import {surfaceEdges} from '../src/VtuberFriends/wwwroot/puppet/surface-mouth.js';
import {fitRigView,meshPoint} from '../src/VtuberFriends/wwwroot/puppet/framing.js';
import {isPuppet} from '../src/VtuberFriends/wwwroot/puppet/packs.js';
const manifest=JSON.parse(await readFile(new URL('../src/VtuberFriends/wwwroot/puppets/amber-dragon/rig.json',import.meta.url),'utf8'));
assert(isPuppet('amber-puppet'));assert(!manifest.parts.some(p=>p.id==='jaw'));assert(!manifest.nodes.some(p=>p.id==='jaw'));assert(!manifest.mouthRig);
const rig=new PuppetRig(manifest),pose=new Float32Array(ParameterNames.length),settings={padding:120,mouthTravel:70};pose[P.EyeOpenLeft]=pose[P.EyeOpenRight]=pose[P.MouthWidth]=1;
const part=id=>rig.parts.find(p=>p.definition.id===id);rig.update(pose,settings);const head=[...part('head').matrix],background=[...part('eye-bg-left').matrix],brow=[...part('brow-left').matrix];
pose[P.EyeLookX]=.8;pose[P.EyeExpression]=1;rig.update(pose,settings);assert.deepEqual([...part('head').matrix],head);assert.deepEqual([...part('eye-bg-left').matrix],background);assert.notDeepEqual([...part('brow-left').matrix],brow);
const iris=[...part('eye-left').matrix];pose[P.EyeLookX]=-.8;rig.update(pose,settings);assert.notDeepEqual([...part('eye-left').matrix],iris);assert.deepEqual([...part('eye-bg-left').matrix],background);
let previousHeight=0;
for(const open of [0,.05,.13,.5,.85,1]){
 pose[P.MouthOpen]=pose[P.JawOffset]=open;rig.update(pose,settings);assert.deepEqual([...part('head').matrix],head,'Voice must not move or split head/muzzle');
 const edge=surfaceEdges(.5,manifest.surfaceMouth,open,70);assert(edge[1]-edge[0]>previousHeight);previousHeight=edge[1]-edge[0];
 for(const side of ['left','right']){
  const fang=part('fang-'+side),p=meshPoint(fang,.5,0,rig),d=fang.definition,t=(d.rect[0]+d.rect[2]/2-manifest.surfaceMouth[0])/manifest.surfaceMouth[2];
  const base=surfaceEdges(t,manifest.surfaceMouth,0,70),now=surfaceEdges(t,manifest.surfaceMouth,open,70);
  assert(Math.abs(p[1]-(d.rect[1]+now[0]-base[0]))<.001,'Fang must follow upper lip');
 }
 const box=fitRigView(rig),n=manifest.meshSegments;for(const p of rig.parts)if(p.alpha>.001)for(let y=0;y<=n;y++)for(let x=0;x<=n;x++){const point=meshPoint(p,x/n,y/n,rig);assert(point[0]>=box[0]&&point[0]<=box[0]+box[2]&&point[1]>=box[1]&&point[1]<=box[1]+box[3]);}
}
for(let t=0;t<=1;t+=.02){const a=surfaceEdges(t,manifest.surfaceMouth,.499,70),b=surfaceEdges(t,manifest.surfaceMouth,.5,70);assert(Math.abs(b[1]-a[1])<.071,'Mouth interpolation jumped');}
pose[P.MouthOpen]=0;rig.update(pose,settings);assert.equal(part('tongue').alpha,0);pose[P.MouthOpen]=1;rig.update(pose,settings);assert.equal(part('tongue').alpha,1);
console.log('PASS: Amber surface mouth without jaw, continuous opening, attached fangs, independent brows/iris/fixed backgrounds, tongue gating and camera bounds. CPU validation.');

const baseline=JSON.parse(await readFile(new URL('./fixtures/amber-mouth-v1.json',import.meta.url),'utf8'));for(const id of ['mouth','tongue','fang-left','fang-right'])assert.deepEqual(manifest.parts.find(p=>p.id===id),baseline.find(p=>p.id===id),'Approved mouth must remain unchanged');
pose.fill(0);pose[P.MouthWidth]=1;rig.update(pose,settings);const restEye=[...part('eye-left').matrix];pose[P.EyeLookX]=pose[P.EyeLookY]=1;rig.update(pose,settings);assert(Math.abs(part('eye-left').matrix[6]-restEye[6])<=9.61);assert(Math.abs(part('eye-left').matrix[7]-restEye[7])<=5.11);
console.log('PASS: calmer Amber gaze and approved surface-mouth definitions preserved.');
