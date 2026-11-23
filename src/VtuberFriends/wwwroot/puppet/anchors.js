import {surfaceEdges} from './surface-mouth.js?v=__UI_VERSION__';
import {usesSerpent,serpentPoint} from './serpent.js?v=__UI_VERSION__';
import {P} from './controllers.js?v=__UI_VERSION__';
export function projectAnchor(rig,name){
 const definition=rig.manifest.anchors?.[name];if(!definition)return null;
 const part=rig.parts.find(p=>p.definition.id===definition.part);if(!part)return null;
 let [x,y]=definition.position;
 if(name==='mouth'&&rig.manifest.surfaceMouth){const rect=rig.manifest.surfaceMouth,edges=surfaceEdges(.5,rect,rig.lastParameters?.[P.MouthOpen]||0,rig.settings?.mouthTravel??70,rig.lastParameters?.[P.MouthForm]||0);x=rect[0]+rect[2]/2;y=(edges[0]+edges[1])/2;}
 else if(name==='mouth')y+=(rig.lastParameters?.[P.MouthOpen]||0)*(rig.settings?.mouthTravel??70)*.35;
 if(['face','surfaceMouth'].includes(part.definition.deform)){
  const px=(x-160)/1216-.5,py=y/760-.5;
  x+=(rig.lastParameters?.[P.HeadAngleX]||0)/20*py*(1-4*px*px)*1216*.025;
  y+=(rig.lastParameters?.[P.HeadAngleY]||0)/20*px*(1-4*py*py)*760*.016;
 }
 if(usesSerpent(part,rig))[x,y]=serpentPoint(x,y,rig.settings?.time||0,rig.settings?.idle??.55);
 const m=part.matrix,worldX=m[0]*x+m[3]*y+m[6],worldY=m[1]*x+m[4]*y+m[7],padding=rig.settings?.padding??280;
 const box=rig.viewBox||[-padding*1.5,-padding,1536+padding*3,1024+padding*2];
 return {x:(worldX-box[0])/box[2],y:(worldY-box[1])/box[3]};
}
