import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PuppetRig} from '../src/VtuberFriends/wwwroot/puppet/rig.js';
import {puppetPacks} from '../src/VtuberFriends/wwwroot/puppet/packs.js';
import {P,ParameterNames} from '../src/VtuberFriends/wwwroot/puppet/controllers.js';
import {surfaceEdges,surfacePoint} from '../src/VtuberFriends/wwwroot/puppet/surface-mouth.js';
import {fitRigView,meshPoint} from '../src/VtuberFriends/wwwroot/puppet/framing.js';
import {switchAccessoryAvatar} from '../src/VtuberFriends/wwwroot/puppet/accessory-profiles.js';
const m=JSON.parse(await readFile(new URL('../src/VtuberFriends/wwwroot/puppets/patch-dragon/rig.json',import.meta.url),'utf8'));
assert.equal(puppetPacks['patch-puppet'].id,m.id);
assert(m.surfaceMouth&&!m.mouthRig&&!m.parts.some(p=>p.id==='jaw'));
assert.equal(m.parts.find(p=>p.id==='bandana').node,'torso');
assert.equal(m.parts.find(p=>p.id==='bandana').src,'bandana.png');
const rig=new PuppetRig(m),v=new Float32Array(ParameterNames.length);
v[P.MouthWidth]=v[P.EyeOpenLeft]=v[P.EyeOpenRight]=1;
assert.throws(()=>new PuppetRig({...m,surfaceSmile:NaN}));
assert.equal(surfaceEdges(.5,m.surfaceMouth,0,70,0,m.surfaceSmile)[0],m.surfaceMouth[1]+30);
for(const open of [0,.5,1])for(const tilt of [-12,0,12]){
 v[P.MouthOpen]=open;v[P.HeadAngleZ]=tilt;v[P.Breath]=.7;rig.update(v,{padding:120,mouthTravel:70});
 const body=rig.parts.find(p=>p.definition.id==='torso'),scarf=rig.parts.find(p=>p.definition.id==='bandana');
 assert.deepEqual(scarf.matrix,body.matrix,'Scarf must follow body');
 const box=fitRigView(rig);
 for(const part of rig.parts)for(let y=0;y<=24;y++)for(let x=0;x<=24;x++){
  const q=meshPoint(part,x/24,y/24,rig);assert(q.every(Number.isFinite));
  assert(q[0]>=box[0]-.01&&q[0]<=box[0]+box[2]+.01&&q[1]>=box[1]-.01&&q[1]<=box[1]+box[3]+.01);
 }
 for(const fang of m.parts.filter(p=>p.deform==='surfaceFangs')){
  const [x,y]=fang.rect,t=(x-m.surfaceMouth[0])/m.surfaceMouth[2];
  const base=surfaceEdges(t,m.surfaceMouth,0,70,0,m.surfaceSmile),now=surfaceEdges(t,m.surfaceMouth,open,70,0,m.surfaceSmile);
  assert(Math.abs(surfacePoint(x,y,0,0,3,rig)[1]-(y+now[0]-base[0]))<1e-6,'Fang follows curved smile');
 }
}
for(const side of ['left','right']){
 const eye=m.parts.find(p=>p.id==='eye-'+side),bg=m.parts.find(p=>p.id==='eye-bg-'+side),b=m.eyeBounds[side],center=eye.rect[0]+eye.rect[2]/2;
 assert.notEqual(eye.src,bg.src);assert.equal(bg.node,'head');assert(side==='left'?center>(b[0]+b[2])/2:center<(b[0]+b[2])/2);
}
const slot={avatar:'ember-puppet',accessoryHat:'top'};switchAccessoryAvatar(slot,'patch-puppet');assert.equal(slot.accessoryHat,'none');slot.accessoryGlasses='round';switchAccessoryAvatar(slot,'ember-puppet');assert.equal(slot.accessoryHat,'top');switchAccessoryAvatar(slot,'patch-puppet');assert.equal(slot.accessoryGlasses,'round');
console.log('PASS: Remiendo independent eyes, cloth scarf follows body, inward gaze, curved smile/attached fangs, camera containment and isolated accessories. CPU validation.');
