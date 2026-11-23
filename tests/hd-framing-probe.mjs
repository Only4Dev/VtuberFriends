import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {rasterSize,effectRaster} from '../src/VtuberFriends/wwwroot/raster.js';
import {PuppetRig} from '../src/VtuberFriends/wwwroot/puppet/rig.js';
import {fitRigView,meshPoint} from '../src/VtuberFriends/wwwroot/puppet/framing.js';
import {projectAnchor} from '../src/VtuberFriends/wwwroot/puppet/anchors.js';
import {P,ParameterNames} from '../src/VtuberFriends/wwwroot/puppet/controllers.js';
const viewport=(w,h)=>({container:{getBoundingClientRect(){return {width:w,height:h};}}});
const sd=effectRaster(viewport(400,300),'medium'),hd=effectRaster(viewport(1440,1080),'medium');
assert(hd.width>=1440&&hd.height>=1080&&hd.width>sd.width,'HD source must allocate actual HD effect pixels');
assert.equal(hd.width/hd.height,4/3);
for(const quality of ['low','medium','high']){const size=rasterSize(400,300,8000,3,quality);assert(size.width<=3072&&size.height<=2304);}
assert(rasterSize(300,200,1080,1,'high').width>=1080);
const manifest=JSON.parse(await readFile(new URL('../src/VtuberFriends/wwwroot/puppets/cyan-dragon/rig.json',import.meta.url),'utf8'));
const rig=new PuppetRig(manifest),p=new Float32Array(ParameterNames.length);p[P.MouthWidth]=1;p[P.EyeOpenLeft]=p[P.EyeOpenRight]=1;
const settings={padding:120,parts:{head:{x:220,y:-150,rotation:10,scaleX:1.1,scaleY:1}},eyeGlow:.4,patternGlow:.4,mouthTravel:130};
let priorHeight=0;
for(const side of [-1,1])for(const open of [0,.5,1]){
 p[P.HeadAngleZ]=side*15;p[P.HeadAngleX]=side*20;p[P.MouthOpen]=p[P.JawOffset]=open;
 p[P.WingLeftRoot]=side*24;p[P.WingRightRoot]=-side*24;p[P.WingLeftTip]=side*25;p[P.WingRightTip]=-side*25;
 rig.update(p,settings);const box=fitRigView(rig);assert(box[3]>=priorHeight);priorHeight=box[3];assert(Math.abs(box[2]/box[3]-1.5)<.00001);
 for(const part of rig.parts)if(part.alpha>.001)for(const spread of [0,20])for(let iy=0;iy<=8;iy++)for(let ix=0;ix<=8;ix++){
  // Test expanded vertices too; the known glow layers need at most twenty world units.
  const point=meshPoint(part,ix/8,iy/8,rig,spread);
  if(spread&& !['head','torso','wing-left','wing-right'].includes(part.definition.id))continue;
  assert(point[0]>=box[0]-.01&&point[0]<=box[0]+box[2]+.01&&point[1]>=box[1]-.01&&point[1]<=box[1]+box[3]+.01,'Animated mesh clipped by camera');
 }
 const mouth=projectAnchor(rig,'mouth');assert(Number.isFinite(mouth.x)&&mouth.x>0&&mouth.x<1,'Anchor projection must share the fitted camera');
}
const size=fitRigView(rig)[3];p[P.HeadAngleZ]=0;rig.update(p,settings);assert(fitRigView(rig)[3]>=size,'Returning to center must not pump camera zoom');
console.log('PASS: HD pixel sizing, resource caps, complete animated mesh containment, stable camera and shared anchor projection. CPU geometry, not GPU visual validation.');
