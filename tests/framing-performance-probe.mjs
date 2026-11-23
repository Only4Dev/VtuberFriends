import assert from 'node:assert/strict';import {readFile,writeFile} from 'node:fs/promises';
import {PuppetRig} from '../src/VtuberFriends/wwwroot/puppet/rig.js';import {fitRigView,meshPoint} from '../src/VtuberFriends/wwwroot/puppet/framing.js';import {P,ParameterNames} from '../src/VtuberFriends/wwwroot/puppet/controllers.js';import {addAccessories} from '../src/VtuberFriends/wwwroot/puppet/accessories.js';
const catalog=JSON.parse(await readFile('src/VtuberFriends/wwwroot/accessories/catalog.json','utf8')),rigs=[];
for(const pack of ['cyan','jade','amber','thoxer','ember','patch','rose','frost']){const m=JSON.parse(await readFile('src/VtuberFriends/wwwroot/puppets/'+pack+'-dragon/rig.json','utf8'));addAccessories(m,catalog);rigs.push(new PuppetRig(m));}
const values=new Float32Array(ParameterNames.length),settings={padding:120,time:0,idle:.8,eyeGlow:.5,patternGlow:.5,accessoryAura:'energy',accessoryFloor:'smoke',accessoryLightning:'storm',accessoryEffect:'nose-smoke',accessoryObject:'phone',accessoryObjectLeft:'galaxy'};
let referenceMs=0,optimizedMs=0;
for(let iteration=0;iteration<20;iteration++)for(const rig of rigs){
 values[P.MouthWidth]=.9+iteration*.01;values[P.MouthOpen]=values[P.JawOffset]=(iteration%5)/4;values[P.HeadAngleZ]=Math.sin(iteration)*18;values[P.HeadAngleX]=Math.cos(iteration)*20;values[P.HeadAngleY]=Math.sin(iteration*.7)*20;values[P.EyeOpenLeft]=values[P.EyeOpenRight]=1;values[P.WingLeftTip]=24;values[P.WingRightTip]=-20;values[P.WingLeftFlex]=1;values[P.WingRightFlex]=.7;settings.time=iteration*.5;rig.update(values,settings);
 let began=performance.now();const box=fitRigView(rig);optimizedMs+=performance.now()-began;
 began=performance.now();const point=new Float32Array(2),segments=rig.manifest.meshSegments||8;
 for(const part of rig.parts)if(part.alpha>.001)for(const radius of [0,20])for(let y=0;y<=segments;y++)for(let x=0;x<=segments;x++){
  if(radius&&!['head','torso','wing-left','wing-right'].includes(part.definition.id))continue;
  meshPoint(part,x/segments,y/segments,rig,radius,point);assert(point[0]>=box[0]-.05&&point[0]<=box[0]+box[2]+.05&&point[1]>=box[1]-.05&&point[1]<=box[1]+box[3]+.05,'Full mesh must fit: '+rig.manifest.id);
 }
 referenceMs+=performance.now()-began;const before=rig.cameraHalfHeight;assert.strictEqual(fitRigView(rig),box);assert.equal(rig.cameraHalfHeight,before);
}
const report={scenario:'CPU only, 8 models x20 extreme poses, all effects; reference full mesh includes containment assertions',optimizedMs:Math.round(optimizedMs),fullMeshValidationMs:Math.round(referenceMs),poses:160};await writeFile('artifacts/framing-performance.json',JSON.stringify(report,null,2));console.log('PASS: every full-mesh vertex contained for 160 extreme poses, cache stable. '+JSON.stringify(report));
