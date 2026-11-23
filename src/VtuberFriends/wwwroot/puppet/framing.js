import {lashOffset} from './lash-contour.js?v=__UI_VERSION__';
import {surfacePoint} from './surface-mouth.js?v=__UI_VERSION__';
import {usesSerpent,serpentPoint} from './serpent.js?v=__UI_VERSION__';
import {P} from './controllers.js?v=__UI_VERSION__';
// CPU projection of the same 8x8 mesh vertices used by the WebGL renderer.
// Camera only grows while animating; explicit margin/part edits reset its envelope.
function edgeAt(edges,t){const scaled=Math.max(0,Math.min(1,t))*8,i=Math.min(7,Math.floor(scaled)),f=scaled-i;return [edges[i][0]+(edges[i+1][0]-edges[i][0])*f,edges[i][1]+(edges[i+1][1]-edges[i][1])*f];}
export function meshPoint(part,u,v,rig,spread=0,out=new Float32Array(2)){
 const d=part.definition,[rx,ry,rw,rh]=d.rect,w=part.warp;
 let x=rx+((u-.5)*(1+2*spread/rw)+.5)*rw,y=ry+((v-.5)*(1+2*spread/rh)+.5)*rh;
 y+=lashOffset(d,u);
 const wing=d.deform==='leftWing'?-1:d.deform==='rightWing'?1:0;
 const travel=rig.settings?.mouthTravel??70;
 if(wing){
  const reach=wing<0?1-u:u,t=Math.max(0,Math.min(1,(reach-.2)/.72)),weight=t*t*(3-2*t),a=w[2]*weight;
  const ex=rx+(wing<0?.48:.52)*rw,ey=ry+.45*rh,qx=x-ex,qy=y-ey;
  x=ex+Math.cos(a)*qx-Math.sin(a)*qy;y=ey+Math.sin(a)*qx+Math.cos(a)*qy+Math.sin(u*Math.PI)*v*v*w[3]*11;
 }else if(d.deform==='lowerJaw'){
  const e=edgeAt(rig.manifest.mouthRig.edges,u);y+=e[0]-e[1]-12+w[2]*travel*Math.pow(Math.max(0,Math.sin(u*Math.PI)),.8);
 }
 if(d.deform==='tongue'||d.deform==='lowerTeeth'){
  const t=Math.max(0,Math.min(1,(x-478)/580)),e=edgeAt(rig.manifest.mouthRig.edges,t),open=rig.lastParameters?.[P.MouthOpen]||0;
  const lower=e[0]-12+open*travel*Math.pow(Math.max(0,Math.sin(t*Math.PI)),.8);
  y=d.deform==='tongue'?lower-4-(1-v)*rh*(.25+.75*open):lower+2-(1-v)*rh;
 }
 if(d.deform?.startsWith('surface'))[x,y]=surfacePoint(x,y,u,v,d.deform==='surfaceFangs'?3:d.deform==='surfaceTongue'?2:1,rig);
 if(usesSerpent(part,rig))[x,y]=serpentPoint(x,y,rig.settings?.time||0,rig.settings?.idle??.55);
 if(!wing){const px=(x-160)/1216-.5,py=y/760-.5;x+=w[0]*py*(1-4*px*px)*1216*.025;y+=w[1]*px*(1-4*py*py)*760*.016;}
 const m=part.matrix;out[0]=m[0]*x+m[3]*y+m[6];out[1]=m[1]*x+m[4]*y+m[7];return out;
}
export function fitRigView(rig){
 if(rig.lockViewBox&&rig.viewBox)return rig.viewBox;
 if(rig.viewBox&&rig.cameraPoseRevision===rig.poseRevision)return rig.viewBox;
 rig.cameraPoseRevision=rig.poseRevision;
 const settings=rig.settings||{},padding=settings.padding??280,key=JSON.stringify([padding,settings.parts,!!settings.eyeGlow,!!settings.patternGlow,!!settings.cyberGlow,settings.accessoryGlasses,settings.accessoryHat,settings.accessoryNecklace,settings.accessoryObject,settings.accessoryObjectLeft,settings.accessoryEdits,settings.accessoryAura,settings.accessoryFloor,settings.accessoryLightning,settings.accessoryEffect]);
 const cx=rig.manifest.canvas[0]/2,cy=rig.manifest.canvas[1]/2,segments=rig.manifest.meshSegments||8;
 if(key!==rig.cameraKey){rig.cameraKey=key;rig.cameraHalfHeight=cy+padding;}
 let half=rig.cameraHalfHeight;rig.boundPoint??=new Float32Array(2);
 for(const part of rig.parts){
  if(part.alpha<=.001)continue;
  const id=part.definition.id,spread=(settings.patternGlow>0&&['head','torso','wing-left','wing-right'].includes(id)||settings.cyberGlow>0&&['head','torso','wing-left','wing-right','brow-left','brow-right'].includes(id))?20:settings.eyeGlow>0&&['eye-left','eye-right'].includes(id)?16:0;
  // Each mesh column is quadratic in v, including wing flex and face warp. Evaluate its endpoints
  // and analytic extrema rather than projecting every row. Serpent displacement is sinusoidal: retain full sampling.
  rig.boundSamples??=Array.from({length:3},()=>new Float32Array(2));
  for(let pass=0;pass<(spread>0?2:1);pass++)for(let ix=0;ix<=segments;ix++){
   const u=ix/segments,radius=pass?spread:0;
   if(usesSerpent(part,rig)){
    for(let iy=0;iy<=segments;iy++){const p=meshPoint(part,u,iy/segments,rig,radius,rig.boundPoint);half=Math.max(half,Math.abs(p[0]-cx)/1.5+8,Math.abs(p[1]-cy)+8);}
   }else{
    const [a,m,b]=rig.boundSamples;meshPoint(part,u,0,rig,radius,a);meshPoint(part,u,.5,rig,radius,m);meshPoint(part,u,1,rig,radius,b);
    half=Math.max(half,Math.abs(a[0]-cx)/1.5+8,Math.abs(b[0]-cx)/1.5+8,Math.abs(a[1]-cy)+8,Math.abs(b[1]-cy)+8);
    for(let axis=0;axis<2;axis++){const q=2*(b[axis]+a[axis]-2*m[axis]),l=b[axis]-a[axis]-q,t=Math.abs(q)>.00001?-l/(2*q):-1;
     if(t>0&&t<1){const value=q*t*t+l*t+a[axis];half=Math.max(half,axis===0?Math.abs(value-cx)/1.5+8:Math.abs(value-cy)+8);}
    }
   }
  }
 }
 rig.cameraHalfHeight=half;rig.viewBox??=new Float32Array(4);
 rig.viewBox[0]=cx-half*1.5;rig.viewBox[1]=cy-half;rig.viewBox[2]=half*3;rig.viewBox[3]=half*2;return rig.viewBox;
}
