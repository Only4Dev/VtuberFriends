import {addAccessories} from '../src/VtuberFriends/wwwroot/puppet/accessories.js';
// Offline art/mesh assembly preview. Does not access a browser or validate GPU shaders.
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {PuppetRig} from '../src/VtuberFriends/wwwroot/puppet/rig.js';
import {fitRigView,meshPoint} from '../src/VtuberFriends/wwwroot/puppet/framing.js';
import {P,ParameterNames} from '../src/VtuberFriends/wwwroot/puppet/controllers.js';
import {sparklePulse} from '../src/VtuberFriends/wwwroot/puppet/sparkles.js';
const require=createRequire(import.meta.url),{createCanvas,loadImage}=require('../.tools/vfx-preview/node_modules/@napi-rs/canvas');
const packId=process.argv[2]||'jade-dragon',output='artifacts/'+packId.replace('-dragon','');
const dir='src/VtuberFriends/wwwroot/puppets/'+packId+'/',m=JSON.parse(await readFile(dir+'rig.json','utf8'));
const accessoryAssets=process.argv.includes('--glasses')?addAccessories(m,JSON.parse(await readFile('src/VtuberFriends/wwwroot/accessories/catalog.json','utf8'))):new Map(),rig=new PuppetRig(m),images=new Map();
for(const p of m.parts)if(p.src&&!images.has(p.src))images.set(p.src,await loadImage(accessoryAssets.has(p.src)?'src/VtuberFriends/wwwroot'+accessoryAssets.get(p.src).split('?')[0]:dir+p.src));
const headImage=images.get(m.parts.find(p=>p.id==='head').src),headCanvas=createCanvas(headImage.width,headImage.height),hc=headCanvas.getContext('2d');hc.drawImage(headImage,0,0);const alpha=hc.getImageData(0,0,headImage.width,headImage.height).data,headDefinition=m.parts.find(p=>p.id==='head');
const holes={};for(const side of ['left','right']){const [x0,y0,x1,y1]=m.eyeBounds?.[side]||(side==='left'?[535,500,730,675]:[815,500,1010,675]),[rx,ry,rw,rh]=headDefinition.rect;const top=[],bottom=[];for(let x=x0;x<=x1;x+=3){const hx=Math.round((headDefinition.uv[0]+(x-rx)/rw*(headDefinition.uv[2]-headDefinition.uv[0]))*headImage.width);let ys=[];for(let y=y0;y<=y1;y++){const hy=Math.round((headDefinition.uv[1]+(y-ry)/rh*(headDefinition.uv[3]-headDefinition.uv[1]))*headImage.height);if(alpha[(hy*headImage.width+hx)*4+3]<32)ys.push(y);}if(ys.length){top.push([x,Math.min(...ys)]);bottom.push([x,Math.max(...ys)]);}}holes[side]=[...top,...bottom.reverse()];}
await mkdir(output,{recursive:true});
for(const [name,time,open,tilt]of [['rest',0,0,0],['speaking',1,.8,-8],['wave',3,0,8],['blink',0,0,0],['surprised',0,.36,0]]){
 const c=createCanvas(1200,800),ctx=c.getContext('2d');ctx.fillStyle='#1b2025';ctx.fillRect(0,0,c.width,c.height);
 const v=new Float32Array(ParameterNames.length);v[P.EyeOpenLeft]=v[P.EyeOpenRight]=v[P.MouthWidth]=1;v[P.MouthOpen]=v[P.JawOffset]=open;v[P.HeadAngleZ]=tilt;v[P.WingLeftRoot]=Math.sin(time)*6;v[P.WingRightRoot]=-Math.sin(time)*6;
 if(name==='blink')v[P.EyeOpenLeft]=v[P.EyeOpenRight]=0;
 if(name==='surprised')v[P.EyeExpression]=1;
 rig.update(v,{padding:120,idle:.8,time,mouthTravel:70,accessoryGlasses:process.argv.includes('--glasses')?'rectangular':'none'});const box=fitRigView(rig),project=p=>[(p[0]-box[0])/box[2]*1200,(p[1]-box[1])/box[3]*800];
 for(const part of rig.parts){
  if(part.alpha<.001)continue;const d=part.definition;ctx.save();ctx.globalAlpha=part.alpha;
  if(d.sparkles){
   for(const [u,v,r,phase]of d.sparkles){
    const pulse=sparklePulse(time,phase),size=r*(.65+.35*pulse);ctx.globalAlpha=part.alpha*pulse;ctx.fillStyle='#fff0fc';ctx.beginPath();
    for(let quadrant=0;quadrant<4;quadrant++)for(let i=0;i<=12;i++){
     const t=i/12,a=(1-t)**2,b=t*t,q=quadrant===0?[a,b]:quadrant===1?[-b,a]:quadrant===2?[-a,-b]:[b,-a];
     const p=project(meshPoint(part,u+q[0]*size*d.rect[3]/d.rect[2],v+q[1]*size,rig));quadrant===0&&i===0?ctx.moveTo(...p):ctx.lineTo(...p);
    }ctx.closePath();ctx.fill();
   }ctx.restore();continue;
  }
  if(m.eyeMask&&(/^(eye-|lid-)/.test(d.id)||d.lashMask)){
   const hole=holes[d.id.includes('left')?'left':'right'],head=rig.parts.find(p=>p.definition.id==='head');ctx.beginPath();if(d.lashMask)ctx.rect(0,0,1200,800);
   for(let i=0;i<hole.length;i++){const [x,y]=hole[i],p=project(meshPoint(head,(x-headDefinition.rect[0])/headDefinition.rect[2],(y-headDefinition.rect[1])/headDefinition.rect[3],rig));i?ctx.lineTo(...p):ctx.moveTo(...p);}ctx.closePath();ctx.clip(d.lashMask?'evenodd':'nonzero');
  }
  if(d.deform==='surfaceTongue'){
   ctx.beginPath();for(let i=0;i<=60;i++){const a=i/60*Math.PI*2,p=project(meshPoint(part,.5+.3*Math.cos(a),.85+.34*Math.sin(a),rig));i?ctx.lineTo(...p):ctx.moveTo(...p);}ctx.closePath();ctx.clip();
  }
  if(d.clipMouth){
   const edges=m.mouthRig.edges,points=[];
   for(let i=0;i<=8;i++)points.push([478+580*i/8,edges[i][0]-(d.deform==='mouthBackdrop'?12:1)]);
   for(let i=8;i>=0;i--)points.push([478+580*i/8,edges[i][0]-12+open*70*Math.pow(Math.max(0,Math.sin(i/8*Math.PI)),.8)+(d.deform==='mouthBackdrop'?20:1)]);
   ctx.beginPath();for(let i=0;i<points.length;i++){const [x,y]=points[i],p=project(meshPoint({...part,definition:{...d,deform:'face',rect:[x,y,1,1]}},0,0,rig));i?ctx.lineTo(...p):ctx.moveTo(...p);}ctx.closePath();ctx.clip();
  }
  const n=m.meshSegments||8;
  for(let y=0;y<n;y++)for(let x=0;x<n;x++)for(const uv of [[[x/n,y/n],[(x+1)/n,y/n],[x/n,(y+1)/n]],[[x/n,(y+1)/n],[(x+1)/n,y/n],[(x+1)/n,(y+1)/n]]]){
   const dst=uv.map(([u,v])=>project(meshPoint(part,u,v,rig)));ctx.save();ctx.beginPath();ctx.moveTo(...dst[0]);ctx.lineTo(...dst[1]);ctx.lineTo(...dst[2]);ctx.closePath();ctx.clip();
   if(d.kind==='solid'){ctx.fillStyle=`rgba(${d.color.slice(0,3).join(',')},${d.color[3]/255})`;ctx.fillRect(0,0,1200,800);}
   else{
    const img=images.get(d.src),src=uv.map(([u,v])=>[(d.flipX?d.uv[2]+u*(d.uv[0]-d.uv[2]):d.uv[0]+u*(d.uv[2]-d.uv[0]))*img.width,(d.uv[1]+v*(d.uv[3]-d.uv[1]))*img.height]);
    const [s0,s1,s2]=src,[p0,p1,p2]=dst,ax=s1[0]-s0[0],ay=s1[1]-s0[1],bx=s2[0]-s0[0],by=s2[1]-s0[1],det=ax*by-ay*bx;
    const a=((p1[0]-p0[0])*by-(p2[0]-p0[0])*ay)/det,b=((p1[1]-p0[1])*by-(p2[1]-p0[1])*ay)/det,k=((p2[0]-p0[0])*ax-(p1[0]-p0[0])*bx)/det,l=((p2[1]-p0[1])*ax-(p1[1]-p0[1])*bx)/det;
    ctx.transform(a,b,k,l,p0[0]-a*s0[0]-k*s0[1],p0[1]-b*s0[0]-l*s0[1]);ctx.drawImage(img,0,0);
   }ctx.restore();
  }ctx.restore();
 }
 await writeFile(output+'/'+name+'.png',c.toBuffer('image/png'));
}
console.log('Rendered offline '+packId+' mesh/assembly previews; not GPU/Streamlabs validation.');
