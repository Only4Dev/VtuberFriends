import {P} from './controllers.js?v=__UI_VERSION__';
// A mouth drawn on an intact muzzle; no jaw texture or jaw transform is used.
export function surfaceEdges(t,rect,open,travel,form=0,smileDepth=12,slant=0){
 const s=Math.pow(Math.max(0,Math.sin(Math.PI*Math.max(0,Math.min(1,t)))),.8),smile=(smileDepth+8*form)*s+slant*(t-.5);
 return [rect[1]+smile-open*12*s,rect[1]+smile+4+open*travel*s];
}
export function surfacePoint(x,y,u,v,kind,rig){
 const rect=rig.manifest.surfaceMouth,parameters=rig.lastParameters,open=parameters?.[P.MouthOpen]||0,form=parameters?.[P.MouthForm]||0,width=Math.max(.85,Math.min(1.15,parameters?.[P.MouthWidth]||1));
 const t=kind===3?Math.max(0,Math.min(1,(x-rect[0])/rect[2])):u,edge=surfaceEdges(t,rect,open,rig.settings?.mouthTravel??70,form,rig.manifest.surfaceSmile??12,rig.manifest.surfaceSlant??0);
 x=rect[0]+rect[2]/2+(x-rect[0]-rect[2]/2)*width;
 if(kind===3)y+=edge[0]-surfaceEdges(t,rect,0,rig.settings?.mouthTravel??70,0,rig.manifest.surfaceSmile??12,rig.manifest.surfaceSlant??0)[0];
 else y=edge[0]+(edge[1]-edge[0])*v;
 return [x,y];
}
