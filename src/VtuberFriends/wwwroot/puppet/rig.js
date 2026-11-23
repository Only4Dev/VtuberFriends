import {P} from './controllers.js?v=__UI_VERSION__';
export function identity(out){out.fill(0);out[0]=out[4]=out[8]=1;return out;}
export function pivotMatrix(out,x,y,angle=0,sx=1,sy=1,dx=0,dy=0){
 const c=Math.cos(angle),s=Math.sin(angle),a=c*sx,b=s*sx,k=-s*sy,d=c*sy;
 out[0]=a;out[1]=b;out[2]=0;out[3]=k;out[4]=d;out[5]=0;out[6]=x+dx-a*x-k*y;out[7]=y+dy-b*x-d*y;out[8]=1;return out;
}
export function multiply(out,a,b){
 for(let col=0;col<3;col++){const i=col*3;out[i]=a[0]*b[i]+a[3]*b[i+1]+a[6]*b[i+2];out[i+1]=a[1]*b[i]+a[4]*b[i+1]+a[7]*b[i+2];out[i+2]=a[2]*b[i]+a[5]*b[i+1]+a[8]*b[i+2];}
 return out;
}
export function validateManifest(manifest){
 if(manifest.hairMotionScale!==undefined&&(!Number.isFinite(manifest.hairMotionScale)||manifest.hairMotionScale<0||manifest.hairMotionScale>2))throw Error('Movimiento de cabello invalido.');
 if(manifest.surfaceSlant!==undefined&&(!Number.isFinite(manifest.surfaceSlant)||Math.abs(manifest.surfaceSlant)>60))throw Error('Inclinacion de sonrisa invalida.');
 if(manifest.surfaceSmile!==undefined&&(!Number.isFinite(manifest.surfaceSmile)||manifest.surfaceSmile<0||manifest.surfaceSmile>60))throw Error('Curva de sonrisa invalida.');
 if(manifest.meshSegments!==undefined&&(!Number.isInteger(manifest.meshSegments)||manifest.meshSegments<8||manifest.meshSegments>32))throw Error('Densidad de malla inválida.');
 if(manifest.schemaVersion!==1||manifest.canvas?.length!==2||!manifest.canvas.every(n=>Number.isFinite(n)&&n>0&&n<=4096))throw Error('Formato de Puppet no válido.');
 if(!Array.isArray(manifest.nodes)||!manifest.nodes.length||manifest.nodes.length>64||!Array.isArray(manifest.parts)||manifest.parts.length>128)throw Error('Jerarquía de Puppet no válida.');
 if(manifest.surfaceMouth&&(!Array.isArray(manifest.surfaceMouth)||manifest.surfaceMouth.length!==4||!manifest.surfaceMouth.every(Number.isFinite)||manifest.surfaceMouth[2]<=0||manifest.surfaceMouth[3]<=0))throw Error('Boca de superficie inválida.');
 const ids=new Set();for(const node of manifest.nodes){if(ids.has(node.id)||node.parent&&!ids.has(node.parent)||node.pivot?.length!==2||!node.pivot.every(Number.isFinite))throw Error('Pivote, orden o ciclo de jerarquía inválido.');ids.add(node.id);}
 const parts=new Set();
 for(const part of manifest.parts){
  if(part.lashOffsets&&(!Array.isArray(part.lashOffsets)||part.lashOffsets.length!==9||!part.lashOffsets.every(v=>Number.isFinite(v)&&Math.abs(v)<=250)))throw Error('Contorno de pestanas invalido.');
  if(part.sparkles&&(!Array.isArray(part.sparkles)||part.sparkles.length>8||part.kind!=='solid'||!part.sparkles.every(star=>Array.isArray(star)&&star.length===4&&star.every(Number.isFinite)&&star[0]>=0&&star[0]<=1&&star[1]>=0&&star[1]<=1&&star[2]>0&&star[2]<=.15)))throw Error('Destellos invalidos.');
  if(parts.has(part.id)||!ids.has(part.node)||!(part.kind==='solid'?part.color?.length===4&&part.color.every(v=>Number.isInteger(v)&&v>=0&&v<=255):/^[-a-z0-9]+\.png$/.test(part.src))||part.rect?.length!==4||!part.rect.every(Number.isFinite)||part.rect[2]<=0||part.rect[3]<=0||part.uv?.length!==4||!part.uv.every(v=>Number.isFinite(v)&&v>=0&&v<=1)||part.uv[2]<=part.uv[0]||part.uv[3]<=part.uv[1])throw Error('Capa o textura de Puppet no válida.');
  parts.add(part.id);
 }
 for(const id of manifest.requiredParts||[])if(!parts.has(id))throw Error('Falta capa obligatoria: '+id);
 if(manifest.parts.some(p=>p.clipMouth)&&(!manifest.mouthRig||manifest.mouthRig.edges?.length!==9||!manifest.mouthRig.edges.every(e=>e.length===2&&e.every(Number.isFinite))))throw Error('Limites de boca invalidos.');
 return manifest;
}
export class PuppetPart{
 constructor(definition){this.definition=definition;this.matrix=new Float32Array(9);this.warp=new Float32Array(4);this.alpha=1;}
}
export class PuppetRig{
 constructor(manifest){
  validateManifest(manifest);this.manifest=manifest;this.nodes=new Map();this.ordered=[];
  for(const definition of manifest.nodes){const node={definition,local:new Float32Array(9),world:new Float32Array(9),parent:this.nodes.get(definition.parent)||null};identity(node.local);identity(node.world);this.nodes.set(definition.id,node);this.ordered.push(node);}
  this.parts=manifest.parts.map(part=>new PuppetPart(part));this.lastParameters=null;
 }
 update(v,settings={}){
  this.poseRevision=(this.poseRevision||0)+1;
  this.settings=settings;
  this.lastParameters=v;const rad=Math.PI/180;
  for(const node of this.ordered){
   const bind=node.definition.bind,[x,y]=node.definition.pivot;let angle=0,sx=1,sy=1,dx=0,dy=0;
   if(bind==='body'){dy=-v[P.Breath]*12;sy=1+v[P.Breath]*.024;}
   if(bind==='neck'){dx=v[P.NeckCompensation];sy=1+v[P.Breath]*.035;}
   if(bind==='head'){angle=v[P.HeadAngleZ]*rad;dx=v[P.HeadPositionX]+v[P.HeadAngleX]*.6;dy=v[P.HeadPositionY]+v[P.HeadAngleY]*.45;sx=1-Math.abs(v[P.HeadAngleX])*.0018;sy=1-Math.abs(v[P.HeadAngleY])*.001;}
   if(bind==='eyeLeft'||bind==='eyeRight'){dx=v[P.EyeLookX]*24*(this.manifest.gazeScale?.[0]??1)+v[P.HeadAngleX]*.25;dy=v[P.EyeLookY]*17*(this.manifest.gazeScale?.[1]??1)+v[P.HeadAngleY]*.18;angle=(bind==='eyeLeft'?1:-1)*v[P.EyeExpression]*-.025;}
   if(bind?.startsWith('lid')){const open=v[bind.includes('Left')?P.EyeOpenLeft:P.EyeOpenRight];dy=(1-open)*node.definition.travel;}
   if(bind==='browLeft'||bind==='browRight'){
    const side=bind==='browLeft'?1:-1;
    dy=-v[P.EyeExpression]*14-v[P.MouthForm]*10-v[P.MouthOpen]*3+side*v[P.EyeLookX]*5;
    angle=-side*v[P.EyeExpression]*.14+side*v[P.MouthForm]*.08+v[P.EyeLookX]*.035;
   }
   if(bind==='browLeft'||bind==='browRight'){dy*=this.manifest.browMotionScale??1;angle*=this.manifest.browMotionScale??1;}
   if(bind==='antennaLeft'||bind==='antennaRight'){
    const side=bind==='antennaLeft'?1:-1,time=settings.time||0,idle=settings.idle??.55;
    angle=(Math.sin(time*1.8+side*.7)*4+Math.sin(time*3.4+side)*1.4-v[P.HeadAngleZ]*.12)*idle*rad;
   }
   if(bind==='hairLeft'||bind==='hairRight'){
    const side=bind==='hairLeft'?1:-1;angle=(Math.sin((settings.time||0)*1.05+side)*1.8-v[P.HeadAngleZ]*.08)*(settings.idle??.55)*(this.manifest.hairMotionScale??1)*rad;
   }
   if(bind==='wingLeftRoot')angle=v[P.WingLeftRoot]*rad;
   if(bind==='wingRightRoot')angle=v[P.WingRightRoot]*rad;
   if(bind==='wingLeftTip')angle=v[P.WingLeftTip]*rad;
   if(bind==='wingRightTip')angle=v[P.WingRightTip]*rad;
   pivotMatrix(node.local,x,y,angle,sx,sy,dx,dy);
   if(node.parent)multiply(node.world,node.parent.world,node.local);else node.world.set(node.local);
  }
  for(const part of this.parts){
   const reference=part.definition.editReference||part.definition.id;
   const edit=settings.parts?.[reference];
   const parent=this.nodes.get(part.definition.node).world;
   if(edit){
    const [rx,ry,rw,rh]=(this.parts.find(p=>p.definition.id===reference)||part).definition.rect;
    part.editMatrix??=new Float32Array(9);
    pivotMatrix(part.editMatrix,rx+rw/2,ry+rh/2,(edit.rotation||0)*rad,edit.scaleX??1,edit.scaleY??1,edit.x||0,edit.y||0);
    multiply(part.matrix,parent,part.editMatrix);
   }else part.matrix.set(parent);part.warp.fill(0);part.alpha=1;
   if(['face','upperLip','lowerJaw','mouth','tongue','mouthBackdrop','lowerTeeth','surfaceMouth','surfaceTongue','surfaceFangs'].includes(part.definition.deform)){part.warp[0]=v[P.HeadAngleX]/20;part.warp[1]=v[P.HeadAngleY]/20;part.warp[2]=0;part.warp[3]=0;}
   if(part.definition.deform==='leftWing'){part.warp[2]=v[P.WingLeftTip]*rad;part.warp[3]=v[P.WingLeftFlex];}
   if(part.definition.deform==='rightWing'){part.warp[2]=v[P.WingRightTip]*rad;part.warp[3]=v[P.WingRightFlex];}
   if(part.definition.deform==='lowerJaw')part.warp[2]=v[P.JawOffset];
   if(part.definition.deform==='mouth')part.alpha=Math.min(1,v[P.MouthOpen]*12);
   if(part.definition.deform==='lowerTeeth')part.alpha=Math.max(0,Math.min(1,(v[P.MouthOpen]-.08)*8));
   if(part.definition.accessory){
    const a=part.definition.accessory;part.alpha=settings[a.key]===a.value?1:0;
    const edit=settings.accessoryEdits?.[this.manifest.id+':'+a.id]||a.defaultEdit||{},[rx,ry,rw,rh]=part.definition.rect;
    let bob=0,turn=0;
    const left=a.key==='accessoryObjectLeft',object=left||a.key==='accessoryObject',prefix=left?'objectLeft':'object';
    const animation=settings[prefix+'Animation']??'float';
    if(object&&animation!=='none'){
     const phase=(settings.objectTime??settings.time??0)*(settings[prefix+'Speed']??1)*2,amount=settings[prefix+'Amplitude']??.4;
     bob=Math.sin(phase)*24*amount;if(animation==='sway')turn=Math.sin(phase*.8)*10*amount;
    }
    part.accessoryBase??=new Float32Array(9);part.accessoryLocal??=new Float32Array(9);part.accessoryBase.set(part.matrix);
    pivotMatrix(part.accessoryLocal,rx+rw/2,ry+rh/2,((edit.rotation||0)+turn)*rad,edit.scale??1,edit.scale??1,edit.x||0,(edit.y||0)+bob);
    multiply(part.matrix,part.accessoryBase,part.accessoryLocal);
   }
   if(part.definition.deform==='surfaceTongue')part.alpha=Math.max(0,Math.min(1,(v[P.MouthOpen]-.08)*5));
   if(part.definition.deform==='tongue')part.alpha=Math.max(0,Math.min(1,(v[P.MouthOpen]-.08)*6));
  }
 }
}
