import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PuppetRig} from '../src/VtuberFriends/wwwroot/puppet/rig.js';
import {P,ParameterNames} from '../src/VtuberFriends/wwwroot/puppet/controllers.js';
import {cyberGlowStrength,mintMask} from '../src/VtuberFriends/wwwroot/puppet/cyber-glow.js';
import {fitRigView,meshPoint} from '../src/VtuberFriends/wwwroot/puppet/framing.js';
import {addAccessories} from '../src/VtuberFriends/wwwroot/puppet/accessories.js';
import {switchAccessoryAvatar} from '../src/VtuberFriends/wwwroot/puppet/accessory-profiles.js';
const m=JSON.parse(await readFile(new URL('../src/VtuberFriends/wwwroot/puppets/thoxer-dragon/rig.json',import.meta.url),'utf8'));
assert(m.cyberGlow&&m.glowPalette==='mint'&&m.surfaceMouth&&!m.mouthRig);assert(!m.parts.some(p=>p.id==='jaw'));
assert.notEqual(m.parts.find(p=>p.id==='brow-left').src,m.parts.find(p=>p.id==='brow-right').src);
assert(m.eyeBounds.left[2]-m.eyeBounds.left[0]>(m.eyeBounds.left[3]-m.eyeBounds.left[1])*2,'Keep narrow serious eye opening');
const catalog=JSON.parse(await readFile(new URL('../src/VtuberFriends/wwwroot/accessories/catalog.json',import.meta.url),'utf8'));assert(catalog.some(a=>a.value==='rectangular'));
addAccessories(m,catalog);const rig=new PuppetRig(m),p=new Float32Array(ParameterNames.length);p[P.MouthWidth]=p[P.EyeOpenLeft]=p[P.EyeOpenRight]=1;
const get=id=>rig.parts.find(p=>p.definition.id===id),settings={padding:120,cyberGlow:.35,accessoryGlasses:'rectangular',mouthTravel:70};
for(const angle of [-12,0,12])for(const open of [0,.5,1]){
 p[P.HeadAngleZ]=angle;p[P.MouthOpen]=p[P.JawOffset]=open;rig.update(p,settings);
 assert.deepEqual(get('accessory-glasses-rectangular').matrix,get('head').matrix,'Glasses follow head');
 const box=fitRigView(rig),n=m.meshSegments;
 for(const part of rig.parts)if(part.alpha>.001)for(const spread of (['head','torso','wing-left','wing-right','brow-left','brow-right'].includes(part.definition.id)?[0,20]:[0]))for(let y=0;y<=n;y++)for(let x=0;x<=n;x++){const q=meshPoint(part,x/n,y/n,rig,spread);assert(q[0]>=box[0]-.01&&q[0]<=box[0]+box[2]+.01&&q[1]>=box[1]-.01&&q[1]<=box[1]+box[3]+.01);}
}
assert(mintMask(.45,.95,.7)>.9);assert.equal(mintMask(.7,.7,.7),0);assert.equal(mintMask(.2,.4,.9),0);assert.equal(mintMask(.15,.15,.18),0);
assert.equal(cyberGlowStrength(0,0),0);assert(Math.abs(cyberGlowStrength(0,1)-cyberGlowStrength(4.8,1))<1e-6);assert(cyberGlowStrength(2.4,.35)>cyberGlowStrength(0,.35));
const slot={avatar:'amber-puppet',accessoryGlasses:'round'};switchAccessoryAvatar(slot,'thoxer-puppet');assert.equal(slot.accessoryGlasses,'none');slot.accessoryGlasses='rectangular';switchAccessoryAvatar(slot,'amber-puppet');assert.equal(slot.accessoryGlasses,'round');switchAccessoryAvatar(slot,'thoxer-puppet');assert.equal(slot.accessoryGlasses,'rectangular');
console.log('PASS: Thoxer serious apertures, independent asymmetric brows, surface mouth/no jaw, optional head-attached rectangular glasses, model profile, mint-only periodic glow and mesh camera. CPU validation.');
