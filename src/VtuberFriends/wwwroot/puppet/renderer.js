import {propKinds,propShader} from './prop-effects.js?v=__UI_VERSION__';
import {useJadeShiny} from './jade-palette.js?v=__UI_VERSION__';
import {packSparkles} from './sparkles.js?v=__UI_VERSION__';
import {cyberGlowStrength} from './cyber-glow.js?v=__UI_VERSION__';
import {usesSerpent} from './serpent.js?v=__UI_VERSION__';
import {fitRigView} from './framing.js?v=__UI_VERSION__';
import {P} from './controllers.js?v=__UI_VERSION__';
const vertexSource=`
attribute vec2 aPoint;
uniform mat3 uMatrix;
uniform vec4 uRect;
uniform vec4 uUV;
uniform vec4 uWarp;
uniform vec2 uCanvas;
uniform vec4 uSerpent;
uniform mat3 uEyeToHead;
varying mediump vec2 vEyePosition;
uniform float uLashFit;
uniform float uLashOffsets[9];
uniform float uWingSide;
uniform float uJaw;
uniform mediump float uGlowPass;
uniform float uGlowRadius;
uniform float uLowerTeeth;
uniform mediump vec2 uEdges[9];
uniform vec4 uViewBox;
uniform mediump float uTongue;
uniform mediump float uOpen;
uniform mediump float uTravel;
uniform mediump float uJawY;
uniform mediump float uSurfaceKind;
uniform mediump vec4 uSurfaceRect;
uniform mediump vec2 uSurfaceForm;
uniform mediump float uSurfaceSmile;
uniform mediump float uSurfaceSlant;

varying mediump vec2 vUV;
varying mediump vec2 vMouthPosition;
vec2 mouthEdge(float t){
 vec2 edge=uEdges[0];
 for(int i=0;i<8;i++){float a=float(i)/8.0,b=float(i+1)/8.0;if(t>=a&&t<=b)edge=mix(uEdges[i],uEdges[i+1],(t-a)*8.0);}
 return edge;
}
vec2 surfaceEdges(float t){
 float s=pow(max(0.0,sin(clamp(t,0.0,1.0)*3.14159265)),.8);
 float smile=(uSurfaceSmile+8.0*uSurfaceForm.x)*s+uSurfaceSlant*(t-.5);
 return vec2(uSurfaceRect.y+smile-uOpen*12.0*s,uSurfaceRect.y+smile+4.0+uOpen*uTravel*s);
}
void main(){
 vec2 localPoint=aPoint;
 if(uGlowPass>.5)localPoint=(aPoint-.5)*(vec2(1.0)+2.0*uGlowRadius/uRect.zw)+.5;
 vec2 p=uRect.xy+localPoint*uRect.zw;
 if(uLashFit>.5){
  float t=clamp(aPoint.x,0.0,1.0)*8.0,offset=0.0;
  for(int i=0;i<8;i++)if(t>=float(i)&&t<=float(i+1))offset=mix(uLashOffsets[i],uLashOffsets[i+1],t-float(i));
  p.y+=offset;
 }

 if(uWingSide!=0.0){
  float reach=uWingSide<0.0?1.0-aPoint.x:aPoint.x;
  float weight=smoothstep(.2,.92,reach);
  vec2 elbow=uRect.xy+vec2(uWingSide < 0.0 ? .48 : .52,.45)*uRect.zw;
  float angle=uWarp.z*weight;
  float c=cos(angle),s=sin(angle);
  vec2 q=p-elbow;p=elbow+mat2(c,s,-s,c)*q;
  p.y+=sin(aPoint.x*3.14159265)*aPoint.y*aPoint.y*uWarp.w*11.0;
 }else if(uJaw>0.5){
  float hingeWeight=pow(max(0.0,sin(aPoint.x*3.14159265)),.8);
  vec2 edge=mouthEdge(aPoint.x);
  p.y+=edge.x-edge.y-12.0+uWarp.z*uTravel*hingeWeight;
 }
 if(uTongue>0.5){
  float t=clamp((p.x-478.0)/580.0,0.0,1.0);
  vec2 edge=mouthEdge(t);
  float lower=edge.x-12.0+uOpen*uTravel*pow(max(0.0,sin(t*3.14159265)),.8);
  p.y=lower-4.0-(1.0-aPoint.y)*uRect.w*(.25+.75*uOpen);
 }
 if(uLowerTeeth>0.5){
  float t=clamp((p.x-478.0)/580.0,0.0,1.0);
  vec2 edge=mouthEdge(t);
  float lower=edge.x-12.0+uOpen*uTravel*pow(max(0.0,sin(t*3.14159265)),.8);
  p.y=lower+2.0-(1.0-aPoint.y)*uRect.w;
 }
 if(uSurfaceKind>.5){
  float t=uSurfaceKind>2.5?clamp((p.x-uSurfaceRect.x)/uSurfaceRect.z,0.0,1.0):aPoint.x;
  vec2 edge=surfaceEdges(t);
  p.x=uSurfaceRect.x+uSurfaceRect.z*.5+(p.x-uSurfaceRect.x-uSurfaceRect.z*.5)*clamp(uSurfaceForm.y,.85,1.15);
  if(uSurfaceKind>2.5){float s=pow(max(0.0,sin(t*3.14159265)),.8);p.y+=edge.x-(uSurfaceRect.y+uSurfaceSmile*s+uSurfaceSlant*(t-.5));}
  else p.y=mix(edge.x,edge.y,aPoint.y);
 }
 if(uSerpent.z>.5){
  float t=clamp((p.y-680.0)/680.0,0.0,1.0);
  p.x+=sin(uSerpent.x*1.35-t*4.6)*t*28.0*uSerpent.y;
  p.y+=(cos(uSerpent.x*1.1475-t*5.2)-cos(uSerpent.x*1.1475))*t*20.0*uSerpent.y;
 }
 vMouthPosition=p;
 vEyePosition=(uEyeToHead*vec3(p,1.0)).xy;
 if(uWingSide==0.0){
  // Every facial piece uses the SAME head-space deformation, regardless of texture bounds.
  float x=(p.x-160.0)/1216.0-.5,y=p.y/760.0-.5;
  p.x+=uWarp.x*y*(1.0-4.0*x*x)*1216.0*.025;
  p.y+=uWarp.y*x*(1.0-4.0*y*y)*760.0*.016;
 }
 vec3 world=uMatrix*vec3(p,1.0);
 gl_Position=vec4((world.x-uViewBox.x)/uViewBox.z*2.0-1.0,1.0-(world.y-uViewBox.y)/uViewBox.w*2.0,0,1);
 vUV=mix(uUV.xy,uUV.zw,localPoint);
}`;
const fragmentSource=`
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uTexture;
uniform sampler2D uEyeMask;
uniform float uEyeClip;
uniform vec4 uEyeBounds;
uniform vec4 uHeadUV;
uniform vec4 uHeadRect;
varying mediump vec2 vEyePosition;
uniform float uJadeShiny;
uniform float uAlpha;
uniform float uAlphaCutoff;
uniform float uOpaqueCutout;
uniform float uClipMouth;
uniform float uBackdrop;
uniform mediump float uGlowPass;
uniform float uGlowKind;
uniform float uGlowPalette;
uniform float uGlowStrength;
uniform vec2 uGlowOffset;
uniform float uFlatBase;
uniform vec4 uBodyUV;
uniform float uSparkleCount;
uniform vec4 uSparkles[8];
uniform float uSparkleTime;
uniform float uSparkleAspect;
uniform float uReveal;
uniform float uRevealHeight;
uniform vec3 uRevealColor;
uniform mediump float uTongue;
uniform mediump float uOpen;
uniform mediump float uTravel;
uniform mediump float uJawY;
uniform mediump float uSurfaceKind;
uniform mediump vec4 uSurfaceRect;
uniform mediump vec2 uSurfaceForm;
uniform mediump float uSurfaceSmile;
uniform mediump float uSurfaceSlant;

uniform mediump vec2 uEdges[9];
varying mediump vec2 vUV;
varying mediump vec2 vMouthPosition;
float revealNoise(vec2 p){
 vec2 cell=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
 float a=fract(sin(dot(cell,vec2(12.9898,78.233)))*43758.5453);
 float b=fract(sin(dot(cell+vec2(1,0),vec2(12.9898,78.233)))*43758.5453);
 float c=fract(sin(dot(cell+vec2(0,1),vec2(12.9898,78.233)))*43758.5453);
 float d=fract(sin(dot(cell+vec2(1,1),vec2(12.9898,78.233)))*43758.5453);
 return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
}
float emission(vec2 uv){
 vec4 source=texture2D(uTexture,uv);vec3 rgb=source.rgb/max(source.a,.001);
 float mint=smoothstep(.055,.17,rgb.g-max(rgb.r,rgb.b))*smoothstep(.45,.7,rgb.g);
 float white=smoothstep(.45,.85,min(rgb.r,min(rgb.g,rgb.b)));
 float gold=smoothstep(.15,.35,min(rgb.r,rgb.g)-rgb.b)*smoothstep(.35,.65,min(rgb.r,rgb.g));
 if(uGlowPalette>1.5)return source.a*(uGlowKind<1.5?max(white,mint):mint);
 if(uGlowKind<1.5)return source.a*(uGlowPalette>.5?max(white,gold):white);
 if(uGlowPalette>.5)return source.a*gold;
 float cyan=smoothstep(.12,.32,min(rgb.g,rgb.b)-rgb.r)*smoothstep(.35,.65,min(rgb.g,rgb.b));
 return source.a*cyan;
}
vec2 surfaceEdges(float t){
 float s=pow(max(0.0,sin(clamp(t,0.0,1.0)*3.14159265)),.8);
 float smile=(uSurfaceSmile+8.0*uSurfaceForm.x)*s+uSurfaceSlant*(t-.5);
 return vec2(uSurfaceRect.y+smile-uOpen*12.0*s,uSurfaceRect.y+smile+4.0+uOpen*uTravel*s);
}
${propShader}
void main(){
 if(abs(uEyeClip)>.5){
  bool inBounds=vEyePosition.x>=uEyeBounds.x&&vEyePosition.y>=uEyeBounds.y&&vEyePosition.x<=uEyeBounds.z&&vEyePosition.y<=uEyeBounds.w;
  if(uEyeClip>0.0&&!inBounds)discard;
  vec2 headPoint=(vEyePosition-uHeadRect.xy)/uHeadRect.zw;
  float headAlpha=texture2D(uEyeMask,mix(uHeadUV.xy,uHeadUV.zw,headPoint)).a;
  if(uEyeClip>0.0&&headAlpha>.1)discard;
  if(uEyeClip<0.0&&inBounds&&headAlpha<.1)discard;
 }
 if(uClipMouth>0.5){
  float t=(vMouthPosition.x-478.0)/580.0;
  if(t<=0.0||t>=1.0||(uOpen<.005&&uBackdrop<.5))discard;
  vec2 edge=uEdges[0];
  for(int i=0;i<8;i++){
   float a=float(i)/8.0,b=float(i+1)/8.0;
   if(t>=a&&t<=b)edge=mix(uEdges[i],uEdges[i+1],(t-a)*8.0);
  }
  float lower=edge.x-12.0+uJawY+uOpen*uTravel*pow(max(0.0,sin(t*3.14159265)),.8);
  float overlap=uBackdrop>.5?20.0:1.0;
  if(vMouthPosition.y<edge.x-(uBackdrop>.5?12.0:1.0)||vMouthPosition.y>lower+overlap)discard;
 }
 vec4 color;
 if(uGlowPass>.5){
  float value=emission(vUV)*.2;
  value+=.1*(emission(vUV+uGlowOffset*vec2(1,0))+emission(vUV+uGlowOffset*vec2(-1,0))+emission(vUV+uGlowOffset*vec2(0,1))+emission(vUV+uGlowOffset*vec2(0,-1)));
  value+=.1*(emission(vUV+uGlowOffset*vec2(.7,.7))+emission(vUV+uGlowOffset*vec2(-.7,.7))+emission(vUV+uGlowOffset*vec2(.7,-.7))+emission(vUV+uGlowOffset*vec2(-.7,-.7)));
  float alpha=value*uGlowStrength*.6;
  color=vec4((uGlowPalette>1.5?vec3(.35,1,.72):uGlowPalette>.5?vec3(1,.75,.18):(uGlowKind<1.5?vec3(.65,.9,1):vec3(.08,.75,1)))*alpha,alpha);
 }else color=texture2D(uTexture,vUV);

 if(uJadeShiny>.5){
  vec3 rgb=color.rgb/max(color.a,.001);
  float mask=smoothstep(.015,.08,rgb.g-max(rgb.r,rgb.b))*smoothstep(.04,.14,rgb.g);
  if(mask>0.0){
   float shade=.018+.36*pow(dot(rgb,vec3(.2126,.7152,.0722)),.9);
   color.rgb=mix(rgb,vec3(shade*.94,shade*.96,shade),mask)*color.a;
  }
 }
 if(uSurfaceKind>.5&&uSurfaceKind<2.5){
  float width=uSurfaceRect.z*clamp(uSurfaceForm.y,.85,1.15);
  float t=(vMouthPosition.x-uSurfaceRect.x-uSurfaceRect.z*.5)/width+.5;
  vec2 edge=surfaceEdges(t);float height=max(1.0,edge.y-edge.x),v=(vMouthPosition.y-edge.x)/height;
  if(uSurfaceKind>1.5){
   if(uOpen<.08||pow((t-.5)/.3,2.0)+pow((v-.85)/.34,2.0)>1.0)discard;
   color.rgb*=.85+.15*v;
  }else{
   float distance=min(vMouthPosition.y-edge.x,edge.y-vMouthPosition.y),rim=1.0-smoothstep(1.0,3.0,distance);
   color=vec4(mix(uGlowPalette>1.5?vec3(.035,.045,.055):vec3(.12,.055,.05),uGlowPalette>1.5?vec3(.08,.09,.10):vec3(.28,.12,.075),rim),1.0);
  }
 }

 if(uSparkleCount>.5){
  float alpha=0.0;
  for(int i=0;i<8;i++){
   if(float(i)<uSparkleCount){
    vec4 star=uSparkles[i];float pulse=pow(.5+.5*sin(uSparkleTime*2.3+star.w),3.0);
    vec2 q=(vUV-star.xy)/max(.001,star.z*(.65+.35*pulse));q.x*=uSparkleAspect;
    float shape=sqrt(abs(q.x))+sqrt(abs(q.y));
    alpha+=max(0.0,1.0-smoothstep(.88,1.0,shape))*pulse;
   }
  }
  alpha=clamp(alpha,0.0,1.0);if(alpha<.005)discard;
  color=vec4(vec3(1.0,.94,.99)*alpha,alpha);
 }
 if(uTongue>0.5)color.rgb=min(color.rgb*1.5,vec3(color.a));
 else if(uClipMouth>0.5)color.rgb*=.8+.4*clamp((vMouthPosition.y-680.0)/140.0,0.0,1.0);
 if(uReveal<.999){
  float field=clamp(.65*(1.0-vMouthPosition.y/uRevealHeight)+.35*revealNoise(vMouthPosition*.028),.001,.998);
  if(uReveal<field)discard;
  float edge=1.0-smoothstep(0.0,.045,uReveal-field);
  color.rgb=min(vec3(color.a),color.rgb+uRevealColor*edge*color.a*.8);
 }
 if(uPropKind>.5)color=propEffect(vUV,color);
 if(uFlatBase>0.0 && (vUV.y-uBodyUV.y)/max(.0001,uBodyUV.w-uBodyUV.y)>uFlatBase)discard;
 if(color.a<uAlphaCutoff)discard;
 if(uOpaqueCutout>.5){color.rgb/=max(.001,color.a);color.a=1.0;}
 gl_FragColor=color*uAlpha;
}
`;
function compile(gl,type,source){const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){const message=gl.getShaderInfoLog(shader);gl.deleteShader(shader);throw Error(message||'No se pudo compilar Puppet.');}return shader;}
export class PuppetRenderer{
 constructor(canvas,rig,images){
  this.canvas=canvas;this.rig=rig;this.lost=false;this.disposed=false;this.gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:true,antialias:true,preserveDrawingBuffer:false});
  if(!this.gl)throw Error('WebGL no disponible para el Puppet.');
  const gl=this.gl;
  this.onLost=event=>{event.preventDefault();this.lost=true;};
  this.onRestore=()=>{if(this.disposed)return;this.resources=[];this.headResource=null;this.initialize(images);this.lost=false;};
  canvas.addEventListener('webglcontextlost',this.onLost);canvas.addEventListener('webglcontextrestored',this.onRestore);
  this.resources=[];this.headResource=null;this.initialize(images);
 }
 initialize(images){
  const gl=this.gl;this.mouthEdges=new Float32Array((this.rig.manifest.mouthRig?.edges||Array.from({length:9},()=>[0,0])).flat());
  const vertex=compile(gl,gl.VERTEX_SHADER,vertexSource),fragment=compile(gl,gl.FRAGMENT_SHADER,fragmentSource);
  this.program=gl.createProgram();gl.attachShader(this.program,vertex);gl.attachShader(this.program,fragment);gl.linkProgram(this.program);gl.deleteShader(vertex);gl.deleteShader(fragment);
  if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(this.program)||'Error al enlazar Puppet.');
  gl.useProgram(this.program);this.point=gl.getAttribLocation(this.program,'aPoint');
  this.uniforms={};for(const name of ['uFlatBase','uBodyUV','uPropKind','uPropParams','uPropColor','uPropExtra','uJadeShiny','uLashFit','uLashOffsets[0]','uSparkleCount','uSparkles[0]','uSparkleTime','uSparkleAspect','uSurfaceSlant','uSurfaceSmile','uSurfaceKind','uSurfaceRect','uSurfaceForm','uHeadRect','uOpaqueCutout','uAlphaCutoff','uEyeToHead','uEyeMask','uEyeClip','uEyeBounds','uHeadUV','uSerpent','uMatrix','uRect','uUV','uWarp','uCanvas','uWingSide','uJaw','uGlowPass','uGlowKind','uGlowPalette','uGlowStrength','uGlowRadius','uGlowOffset','uTongue','uLowerTeeth','uBackdrop','uReveal','uRevealHeight','uRevealColor','uClipMouth','uOpen','uTravel','uJawY','uViewBox','uEdges[0]','uAlpha','uTexture'])this.uniforms[name]=gl.getUniformLocation(this.program,name);
  const segments=this.rig.manifest.meshSegments||8,vertices=new Float32Array(segments*segments*12);let k=0;
  for(let y=0;y<segments;y++)for(let x=0;x<segments;x++){
   const x0=x/segments,x1=(x+1)/segments,y0=y/segments,y1=(y+1)/segments;
   for(const value of [x0,y0,x1,y0,x0,y1,x0,y1,x1,y0,x1,y1])vertices[k++]=value;
  }
  this.vertexCount=vertices.length/2;this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.STATIC_DRAW);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);
  this.images=images;this.texturePool=new Map();
  for(const part of this.rig.parts){
   const texture=part.definition.accessory?null:this.textureFor(part.definition,images.get(part.definition.src));
   this.resources.push({lashOffsets:part.definition.lashOffsets?new Float32Array(part.definition.lashOffsets):null,sparkles:packSparkles(part.definition.sparkles),texture,part,rect:new Float32Array(part.definition.rect),uv:new Float32Array(part.definition.flipX?[part.definition.uv[2],part.definition.uv[1],part.definition.uv[0],part.definition.uv[3]]:part.definition.uv),side:part.definition.deform==='leftWing'?-1:part.definition.deform==='rightWing'?1:0});
  }
  gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.clearColor(0,0,0,0);
 }
 textureFor(def,image){
  const gl=this.gl,key=def.kind==='solid'?JSON.stringify(def.color):image??'placeholder';let texture=this.texturePool.get(key);if(texture)return texture;
  texture=gl.createTexture();this.texturePool.set(key,texture);gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  if(def.kind==='solid'||!image)gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array(def.color||[255,255,255,255]));else gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
  return texture;
 }
 draw(materialization){
  if(this.lost||this.disposed)return;
  const gl=this.gl;gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(this.program);
  gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.enableVertexAttribArray(this.point);gl.vertexAttribPointer(this.point,2,gl.FLOAT,false,0,0);
  gl.uniform2f(this.uniforms.uCanvas,this.rig.manifest.canvas[0],this.rig.manifest.canvas[1]);gl.uniform1i(this.uniforms.uTexture,0);
  const reveal=materialization?.progress??1,color=materialization?.color||[255,195,110];
  gl.uniform1f(this.uniforms.uRevealHeight,this.rig.manifest.canvas[1]);gl.uniform1f(this.uniforms.uReveal,reveal);gl.uniform3f(this.uniforms.uRevealColor,color[0]/255,color[1]/255,color[2]/255);
  const settings=this.rig.settings||{},padding=settings.padding??280;
  gl.uniform4fv(this.uniforms.uViewBox,fitRigView(this.rig));
  gl.uniform1f(this.uniforms.uTravel,settings.mouthTravel??70);gl.uniform1f(this.uniforms.uJawY,settings.parts?.jaw?.y||0);
  gl.uniform2fv(this.uniforms['uEdges[0]'],this.mouthEdges);
  gl.uniform1f(this.uniforms.uOpen,this.rig.lastParameters?.[P.MouthOpen]||0);
  const cyber=this.rig.manifest.cyberGlow?cyberGlowStrength(settings.time||0,settings.cyberGlow||0):0;
  for(const resource of this.resources){
   this.drawPart(resource,0,0);
   if(cyber>0&&(['head','torso','wing-left','wing-right','brow-left','brow-right'].includes(resource.part.definition.id)))this.drawPart(resource,3,cyber);
   if(settings.patternGlow>0&&['head','torso','wing-left','wing-right'].includes(resource.part.definition.id))this.drawPart(resource,2,settings.patternGlow);
  }
  if(settings.eyeGlow>0)for(const resource of this.resources){
   const id=resource.part.definition.id;if(id!=='eye-left'&&id!=='eye-right')continue;
   const open=this.rig.lastParameters?.[id==='eye-left'?P.EyeOpenLeft:P.EyeOpenRight]??1;
   const strength=settings.eyeGlow*Math.max(0,Math.min(1,(open-.18)/.82));if(strength>0)this.drawPart(resource,1,strength);
  }
 }
 drawPart(resource,kind,strength){
  if(resource.part.alpha<=.001)return;const gl=this.gl,def=resource.part.definition,radius=kind===1?16:20;
  if(!resource.texture){
   const procedural=def.accessory?.fx&&def.accessory.fx!=='phone';const image=this.images.get(def.src);
   if(procedural||image||!this.images.load)resource.texture=this.textureFor(def,image);
   else{if(!resource.loading&&!resource.failed){resource.loading=true;this.images.load(def.src).then(bitmap=>{if(!this.disposed&&!this.lost)resource.texture=this.textureFor(def,bitmap);}).catch(()=>{resource.failed=true;}).finally(()=>{resource.loading=false;});}return;}
  }
  const effect=def.accessory?.fx,edit=this.rig.settings?.accessoryEdits?.[this.rig.manifest.id+':'+def.accessory?.id]||{};
  gl.uniform1f(this.uniforms.uPropKind,propKinds[effect]||0);
  if(effect){const time=this.rig.settings?.time||0,color=edit.color|| (effect==='nose-smoke'?'#becbd9':effect==='galaxy'?'#a888ff':'#72dafa');gl.uniform4f(this.uniforms.uPropParams,time,edit.intensity??1,edit.speed??1,edit.interval??22);gl.uniform3f(this.uniforms.uPropColor,parseInt(color.slice(1,3),16)/255,parseInt(color.slice(3,5),16)/255,parseInt(color.slice(5,7),16)/255);gl.uniform2f(this.uniforms.uPropExtra,edit.spread??.32,this.rig.settings?.effectPreview?1:0);}
  gl.uniform1f(this.uniforms.uFlatBase,def.id==='torso'&&this.rig.manifest.behavior!=='serpent'?.9:0);gl.uniform4fv(this.uniforms.uBodyUV,resource.uv);
  gl.uniform1f(this.uniforms.uJadeShiny,useJadeShiny(this.rig,def,kind)?1:0);
  gl.uniform1f(this.uniforms.uOpaqueCutout,!kind&&def.opaqueCutout?1:0);gl.uniform1f(this.uniforms.uAlphaCutoff,kind?0:def.alphaCutoff??0);gl.uniform1f(this.uniforms.uGlowPass,kind?1:0);gl.uniform1f(this.uniforms.uGlowKind,kind);gl.uniform1f(this.uniforms.uGlowPalette,this.rig.manifest.glowPalette==='mint'?2:this.rig.manifest.behavior==='serpent'||this.rig.manifest.glowPalette==='gold'?1:0);gl.uniform1f(this.uniforms.uGlowStrength,strength);gl.uniform1f(this.uniforms.uGlowRadius,radius);
  gl.uniform2f(this.uniforms.uGlowOffset,(def.uv[2]-def.uv[0])/def.rect[2]*radius,(def.uv[3]-def.uv[1])/def.rect[3]*radius);
  const eyeClip=this.rig.manifest.eyeMask&&(/^(eye-|lid-)/.test(def.id)||def.lashMask),head=this.headResource??=this.resources.find(r=>r.part.definition.id==='head');
  gl.uniform1f(this.uniforms.uEyeClip,eyeClip?(def.lashMask?-1:1):0);
  gl.uniform1f(this.uniforms.uLashFit,resource.lashOffsets?1:0);if(resource.lashOffsets)gl.uniform1fv(this.uniforms['uLashOffsets[0]'],resource.lashOffsets);
  if(eyeClip){
   const h=head.part.matrix,p=resource.part.matrix,det=h[0]*h[4]-h[1]*h[3],inverse=resource.eyeInverse??=new Float32Array(9);inverse.set([h[4]/det,-h[1]/det,0,-h[3]/det,h[0]/det,0,(h[3]*h[7]-h[4]*h[6])/det,(h[1]*h[6]-h[0]*h[7])/det,1]);
   const toHead=resource.eyeToHead??=new Float32Array(9);for(let col=0;col<3;col++){const i=col*3;toHead[i]=inverse[0]*p[i]+inverse[3]*p[i+1]+inverse[6]*p[i+2];toHead[i+1]=inverse[1]*p[i]+inverse[4]*p[i+1]+inverse[7]*p[i+2];toHead[i+2]=p[i+2];}
   gl.uniformMatrix3fv(this.uniforms.uEyeToHead,false,toHead);gl.uniform4fv(this.uniforms.uHeadUV,head.uv);gl.uniform4fv(this.uniforms.uHeadRect,head.rect);
   gl.uniform4fv(this.uniforms.uEyeBounds,this.rig.manifest.eyeBounds?.[def.id.includes('left')?'left':'right']||(def.id.includes('left')?[535,500,730,675]:[815,500,1010,675]));
   gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,head.texture);gl.uniform1i(this.uniforms.uEyeMask,1);gl.activeTexture(gl.TEXTURE0);
  }
  gl.uniform1f(this.uniforms.uSparkleCount,def.sparkles?.length||0);if(def.sparkles?.length){gl.uniform4fv(this.uniforms['uSparkles[0]'],resource.sparkles);gl.uniform1f(this.uniforms.uSparkleTime,this.rig.settings?.time||0);gl.uniform1f(this.uniforms.uSparkleAspect,def.rect[2]/def.rect[3]);}
  const surfaceKind=def.deform==='surfaceMouth'?1:def.deform==='surfaceTongue'?2:def.deform==='surfaceFangs'?3:0;
  gl.uniform1f(this.uniforms.uSurfaceSlant,this.rig.manifest.surfaceSlant??0);gl.uniform1f(this.uniforms.uSurfaceSmile,this.rig.manifest.surfaceSmile??12);gl.uniform1f(this.uniforms.uSurfaceKind,surfaceKind);gl.uniform4fv(this.uniforms.uSurfaceRect,this.rig.manifest.surfaceMouth||[0,0,1,1]);gl.uniform2f(this.uniforms.uSurfaceForm,this.rig.lastParameters?.[P.MouthForm]||0,this.rig.lastParameters?.[P.MouthWidth]||1);
  gl.uniform4f(this.uniforms.uSerpent,this.rig.settings?.time||0,this.rig.settings?.idle??.55,usesSerpent(resource.part,this.rig)?1:0,0);
  gl.bindTexture(gl.TEXTURE_2D,resource.texture);gl.uniformMatrix3fv(this.uniforms.uMatrix,false,resource.part.matrix);
  gl.uniform4fv(this.uniforms.uRect,resource.rect);gl.uniform4fv(this.uniforms.uUV,resource.uv);gl.uniform4fv(this.uniforms.uWarp,resource.part.warp);
  gl.uniform1f(this.uniforms.uWingSide,resource.side);gl.uniform1f(this.uniforms.uJaw,def.deform==='lowerJaw'?1:0);gl.uniform1f(this.uniforms.uTongue,def.deform==='tongue'?1:0);gl.uniform1f(this.uniforms.uLowerTeeth,def.deform==='lowerTeeth'?1:0);gl.uniform1f(this.uniforms.uBackdrop,def.deform==='mouthBackdrop'?1:0);gl.uniform1f(this.uniforms.uClipMouth,def.clipMouth?1:0);gl.uniform1f(this.uniforms.uAlpha,resource.part.alpha);
  gl.drawArrays(gl.TRIANGLES,0,this.vertexCount);
 }
 dispose(){
  if(this.disposed)return;this.disposed=true;const gl=this.gl;
  if(!this.lost){for(const texture of this.texturePool.values())gl.deleteTexture(texture);gl.deleteBuffer(this.buffer);gl.deleteProgram(this.program);}
  this.canvas.removeEventListener('webglcontextlost',this.onLost);this.canvas.removeEventListener('webglcontextrestored',this.onRestore);
 }
}
