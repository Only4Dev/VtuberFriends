import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PuppetRig} from '../src/VtuberFriends/wwwroot/puppet/rig.js';
import {puppetPacks} from '../src/VtuberFriends/wwwroot/puppet/packs.js';
import {P,ParameterNames} from '../src/VtuberFriends/wwwroot/puppet/controllers.js';
import {surfaceEdges,surfacePoint} from '../src/VtuberFriends/wwwroot/puppet/surface-mouth.js';
import {fitRigView,meshPoint} from '../src/VtuberFriends/wwwroot/puppet/framing.js';
import {switchAccessoryAvatar} from '../src/VtuberFriends/wwwroot/puppet/accessory-profiles.js';
const m=JSON.parse(await readFile(new URL('../src/VtuberFriends/wwwroot/puppets/frost-dragon/rig.json',import.meta.url),'utf8'));
const part=id=>m.parts.find(p=>p.id===id);
assert.equal(puppetPacks['frost-puppet'].id,m.id);assert(m.integratedForelock&&!part('jaw'));
assert(!part('head').flipX);assert(m.anchors.hornLeft.position[1]<m.anchors.hornRight.position[1]);
assert.notEqual(part('brow-left').src,part('brow-right').src,'Do not mirror asymmetric brows');
assert(m.eyeBounds.left[3]-m.eyeBounds.left[1]<(m.eyeBounds.right[3]-m.eyeBounds.right[1])*.7,'Left eye stays more half-lidded');
assert.deepEqual(part('eye-left').rect.slice(2),part('eye-right').rect.slice(2),'Same iris size, different occlusion');
for(const side of ['left','right']){assert.notEqual(part('eye-'+side).src,part('eye-bg-'+side).src);assert.equal(part('eye-bg-'+side).node,'head');}
assert(part('torso').rect[2]>=700,'Preserve broad chest and short visible neck');
const rig=new PuppetRig(m),v=new Float32Array(ParameterNames.length);v[P.MouthWidth]=v[P.EyeOpenLeft]=v[P.EyeOpenRight]=1;
for(const angle of [-12,0,12])for(const open of [0,.5,1]){
 v[P.HeadAngleZ]=angle;v[P.MouthOpen]=open;v[P.WingLeftRoot]=6;v[P.WingRightRoot]=-6;v[P.WingLeftTip]=8;v[P.WingRightTip]=-8;v[P.Breath]=.7;rig.update(v,{padding:120,mouthTravel:70});
 const box=fitRigView(rig);
 for(const p of rig.parts)for(let y=0;y<=24;y++)for(let x=0;x<=24;x++){
  const q=meshPoint(p,x/24,y/24,rig);assert(q.every(Number.isFinite));assert(q[0]>=box[0]-.01&&q[0]<=box[0]+box[2]+.01&&q[1]>=box[1]-.01&&q[1]<=box[1]+box[3]+.01);
 }
 for(const fang of m.parts.filter(p=>p.deform==='surfaceFangs')){
  const [x,y]=fang.rect,t=(x-m.surfaceMouth[0])/m.surfaceMouth[2],base=surfaceEdges(t,m.surfaceMouth,0,70,0,m.surfaceSmile,m.surfaceSlant),now=surfaceEdges(t,m.surfaceMouth,open,70,0,m.surfaceSmile,m.surfaceSlant);
  assert(Math.abs(surfacePoint(x,y,0,0,3,rig)[1]-(y+now[0]-base[0]))<1e-6);
 }
}
assert(surfaceEdges(1,m.surfaceMouth,0,70,0,m.surfaceSmile,m.surfaceSlant)[0]<surfaceEdges(0,m.surfaceMouth,0,70,0,m.surfaceSmile,m.surfaceSlant)[0]);
const slot={avatar:'rose-puppet',accessoryHat:'top'};switchAccessoryAvatar(slot,'frost-puppet');assert.equal(slot.accessoryHat,'none');slot.accessoryGlasses='round';switchAccessoryAvatar(slot,'rose-puppet');assert.equal(slot.accessoryHat,'top');switchAccessoryAvatar(slot,'frost-puppet');assert.equal(slot.accessoryGlasses,'round');
console.log('PASS: Boreal registry, asymmetric horn anchors/brows/apertures, equal iris size, surface smirk/attached fangs, broad chest, complete animated framing and separate accessories. CPU validation.');
