import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PuppetRig} from '../src/VtuberFriends/wwwroot/puppet/rig.js';
import {P,ParameterNames} from '../src/VtuberFriends/wwwroot/puppet/controllers.js';
import {serpentPoint} from '../src/VtuberFriends/wwwroot/puppet/serpent.js';
import {fitRigView,meshPoint} from '../src/VtuberFriends/wwwroot/puppet/framing.js';
import {puppetPacks,isPuppet} from '../src/VtuberFriends/wwwroot/puppet/packs.js';
const manifest=JSON.parse(await readFile(new URL('../src/VtuberFriends/wwwroot/puppets/jade-dragon/rig.json',import.meta.url),'utf8'));
assert(isPuppet('jade-puppet')&&isPuppet('cyan-puppet'));assert.notEqual(puppetPacks['jade-puppet'].id,puppetPacks['cyan-puppet'].id);
const rig=new PuppetRig(manifest),v=new Float32Array(ParameterNames.length);v[P.EyeOpenLeft]=v[P.EyeOpenRight]=v[P.MouthWidth]=1;
const settings={time:0,idle:.8,padding:120};rig.update(v,settings);
const part=id=>rig.parts.find(p=>p.definition.id===id),bg=[...part('eye-bg-left').matrix],iris=[...part('eye-left').matrix];
v[P.EyeLookX]=.8;v[P.EyeLookY]=-.5;rig.update(v,settings);assert.deepEqual([...part('eye-bg-left').matrix],bg);assert.notDeepEqual([...part('eye-left').matrix],iris);
const eyelid=[...part('lid-left-upper').matrix];v[P.EyeOpenLeft]=0;rig.update(v,settings);assert.notDeepEqual([...part('lid-left-upper').matrix],eyelid);assert.deepEqual([...part('eye-bg-left').matrix],bg);
for(let time=0;time<12;time+=.5){
 assert.deepEqual(serpentPoint(768,680,time,1),[768,680],'Neck joint must stay welded');
 for(let y=680;y<1400;y+=20){const a=serpentPoint(700,y,time,1),b=serpentPoint(700,y+.01,time,1);assert((b[1]-a[1])/.01>.7,'Continuous field folded');}
 settings.time=time;v[P.HeadAngleZ]=Math.sin(time)*15;v[P.HeadAngleX]=Math.cos(time)*20;v[P.MouthOpen]=v[P.JawOffset]=.8;rig.update(v,settings);const box=fitRigView(rig),n=manifest.meshSegments;
 for(const p of rig.parts)if(p.alpha>.001)for(let y=0;y<=n;y++)for(let x=0;x<=n;x++){const q=meshPoint(p,x/n,y/n,rig);assert(q[0]>=box[0]&&q[0]<=box[0]+box[2]&&q[1]>=box[1]&&q[1]<=box[1]+box[3]);}
}
assert.deepEqual(serpentPoint(700,1100,1,0),[700,1100]);assert.notDeepEqual(serpentPoint(700,850,1,1),serpentPoint(700,1200,1,1));
console.log('PASS: Jade/Cyan pack isolation, fixed eye background + independent pupil/curtains, anchored continuous body deformation, no folds and complete 24x24 camera containment. CPU validation.');
