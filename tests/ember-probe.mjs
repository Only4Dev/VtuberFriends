import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PuppetRig} from '../src/VtuberFriends/wwwroot/puppet/rig.js';
import {puppetPacks} from '../src/VtuberFriends/wwwroot/puppet/packs.js';
import {P,ParameterNames} from '../src/VtuberFriends/wwwroot/puppet/controllers.js';
import {fitRigView,meshPoint} from '../src/VtuberFriends/wwwroot/puppet/framing.js';
import {switchAccessoryAvatar} from '../src/VtuberFriends/wwwroot/puppet/accessory-profiles.js';
const m=JSON.parse(await readFile(new URL('../src/VtuberFriends/wwwroot/puppets/ember-dragon/rig.json',import.meta.url),'utf8'));
assert.equal(puppetPacks['ember-puppet'].id,m.id);
assert(m.surfaceMouth&&!m.mouthRig&&!m.parts.some(p=>p.id==='jaw'));
const part=id=>m.parts.find(p=>p.id===id);
for(const side of ['left','right']){
 assert.notEqual(part('eye-'+side).src,part('eye-bg-'+side).src);
 assert.equal(part('eye-bg-'+side).node,'head');
 assert(m.nodes.some(n=>n.id==='lid-'+side+'-upper'&&n.travel>0));
 const r=part('eye-'+side).rect,b=m.eyeBounds[side],center=r[0]+r[2]/2;
 assert(side==='left'?center>(b[0]+b[2])/2:center<(b[0]+b[2])/2,'Neutral iris is closer to nose');
}
const rig=new PuppetRig(m),v=new Float32Array(ParameterNames.length);
v[P.MouthWidth]=v[P.EyeOpenLeft]=v[P.EyeOpenRight]=1;
for(const open of [0,.5,1])for(const angle of [-12,0,12]){
 v[P.MouthOpen]=open;v[P.HeadAngleZ]=angle;rig.update(v,{padding:120,mouthTravel:70});
 const box=fitRigView(rig);
 for(const p of rig.parts)if(p.alpha>.001)for(let y=0;y<=24;y++)for(let x=0;x<=24;x++){
  const q=meshPoint(p,x/24,y/24,rig);assert(q.every(Number.isFinite));
  assert(q[0]>=box[0]-.01&&q[0]<=box[0]+box[2]+.01&&q[1]>=box[1]-.01&&q[1]<=box[1]+box[3]+.01);
 }
}
const slot={avatar:'thoxer-puppet',accessoryGlasses:'rectangular'};
switchAccessoryAvatar(slot,'ember-puppet');assert.equal(slot.accessoryGlasses,'none');slot.accessoryHat='top';
switchAccessoryAvatar(slot,'thoxer-puppet');assert.equal(slot.accessoryGlasses,'rectangular');
switchAccessoryAvatar(slot,'ember-puppet');assert.equal(slot.accessoryHat,'top');
console.log('PASS: Ascua registry, inward neutral gaze, independent eyes/lids, surface mouth without jaw, finite animated framing and separate accessory profile. CPU validation.');
