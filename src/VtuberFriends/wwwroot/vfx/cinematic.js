import {effectRaster,applyEffectRaster} from '../raster.js?v=__UI_VERSION__';
// Procedural transition scenes. All coordinates use the shared 400 x 300 stage.
export const cinematicPresets=Object.freeze({
 hacker:{label:'Hacker · ensamblaje cibernético',duration:2900,exitDuration:2400,color:[87,255,180],seed:911},
 summon:{label:'Invocación · pentagrama y fuego',duration:3000,exitDuration:2600,color:[255,155,63],seed:71},
 tempest:{label:'Tormenta · nube y relámpagos',duration:3000,exitDuration:2700,color:[130,205,255],seed:193},
 celestial:{label:'Dragón celestial · haz de invocación',duration:4400,exitDuration:3900,color:[133,255,194],seed:317}
});
export const clamp=x=>Math.max(0,Math.min(1,x));
const ease=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
const rgba=(c,a)=>`rgba(${c[0]},${c[1]},${c[2]},${clamp(a)})`;
const TAU=Math.PI*2;
export function sceneState(kind,t,exit=false){
 t=clamp(t);const later=kind==='celestial';
 const reveal=exit?1-ease(.22,later?.74:.70,t):ease(later?.48:.32,later?.82:.76,t);
 return {t,reveal,envelope:ease(0,.14,t)*(1-ease(.78,1,t)),charge:ease(.06,.36,t)*(1-ease(.62,.94,t)),beam:ease(later?.27:.22,later?.43:.43,t)*(1-ease(.72,.94,t))};
}
function random(seed){return ()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;};}
export function sceneResources(seed,quality='medium',density=.75){
 const rand=random(seed),count=Math.round((quality==='low'?48:quality==='high'?120:80)*Math.max(.25,clamp(density)));
 return {particles:Array.from({length:count},(_,i)=>({a:rand()*TAU,r:rand(),speed:.35+rand(),phase:rand(),size:.5+rand()*1.8,i})),
 clouds:Array.from({length:quality==='low'?18:32},(_,i)=>({x:(rand()-.5)*280,y:(rand()-.5)*85,r:25+rand()*35,phase:rand()*TAU,front:i%3===0})),
 bolts:Array.from({length:5},(_,i)=>Array.from({length:9},(_,j)=>({x:90+i*54+(rand()-.5)*30,y:35+j*24})))};
}
function glow(ctx,x,y,r,color,alpha=1){
 const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,rgba(color,alpha));g.addColorStop(.3,rgba(color,alpha*.35));g.addColorStop(1,rgba(color,0));ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
}
function line(ctx,points,color,width=1,closed=false){
 ctx.beginPath();for(let i=0;i<points.length;i++)i?ctx.lineTo(points[i][0],points[i][1]):ctx.moveTo(points[i][0],points[i][1]);if(closed)ctx.closePath();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();
}
function ellipseRing(ctx,r,width,color){ctx.beginPath();ctx.ellipse(0,0,r,r,0,0,TAU);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
function rune(ctx,index,r,angle,alpha,color){
 ctx.save();ctx.rotate(angle);ctx.translate(0,-r);ctx.lineCap='round';
 const variant=index%6,c=rgba(color,alpha);
 line(ctx,[[0,-5],[0,5]],c,.9);line(ctx,[[-3,-2],[0,-5],[3,-2]],c,.8);
 if(variant%2)line(ctx,[[-3,3],[0,0],[3,3]],c,.8);
 if(variant%3===0)line(ctx,[[-3,-1],[-3,4],[3,4],[3,-1]],c,.7);
 if(variant===2||variant===4)line(ctx,[[-4,1],[4,-2]],c,.9);
 ctx.restore();
}
function circle(ctx,state,color,exit){
 const {t,envelope:e}=state;ctx.save();ctx.translate(200,235);ctx.scale(1,.29);ctx.rotate((exit?-1:1)*t*.7);
 glow(ctx,0,0,137,color,e*.35);ctx.globalCompositeOperation='lighter';
 for(const [r,w,a]of [[125,1,.45],[118,2,.8],[100,.8,.65],[86,1.2,.8]])ellipseRing(ctx,r,w,rgba(color,e*a));
 const points=Array.from({length:5},(_,i)=>{const a=-Math.PI/2+i*TAU/5;return [Math.cos(a)*86,Math.sin(a)*86];});
 const star=[points[0],points[2],points[4],points[1],points[3]];line(ctx,star,rgba(color,e*.95),1.4,true);
 for(let i=0;i<28;i++)rune(ctx,i,109,i*TAU/28,e*.85,color);
 ctx.rotate(-t*1.4);for(let i=0;i<10;i++){const a=i*TAU/10;line(ctx,[[Math.cos(a)*123,Math.sin(a)*123],[Math.cos(a)*132,Math.sin(a)*132]],rgba(color,e*.7),1);}
 ctx.restore();
}
function flame(ctx,x,y,size,phase,color,alpha){
 ctx.save();ctx.translate(x,y);ctx.scale(size,size);ctx.globalAlpha*=alpha;ctx.globalCompositeOperation='lighter';
 const sway=Math.sin(phase)*7,g=ctx.createLinearGradient(0,0,0,-40);g.addColorStop(0,rgba(color,.08));g.addColorStop(.45,rgba(color,.65));g.addColorStop(1,'rgba(255,244,192,0)');
 ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(-10,2);ctx.bezierCurveTo(-20,-14,3+sway,-14,sway,-43);ctx.bezierCurveTo(26+sway,-14,14,-14,12,2);ctx.closePath();ctx.fill();
 const core=ctx.createLinearGradient(0,0,0,-25);core.addColorStop(0,'rgba(255,255,210,.8)');core.addColorStop(1,rgba(color,0));ctx.fillStyle=core;ctx.beginPath();ctx.moveTo(-4,0);ctx.quadraticCurveTo(-7,-10,sway*.5,-28);ctx.quadraticCurveTo(9,-10,5,0);ctx.fill();ctx.restore();
}
function embers(ctx,state,res,color,front,exit){
 const {t,envelope:e}=state;ctx.save();ctx.globalCompositeOperation='lighter';
 for(const p of res.particles){
  if((p.i%3===0)!==front)continue;
  const life=(t*p.speed*2+p.phase)%1,angle=p.a+t*.9;
  const radius=38+p.r*95+life*14;
  const x=200+Math.cos(angle)*radius,y=232-life*180+Math.sin(angle)*12;
  const alpha=Math.sin(life*Math.PI)*e*(.25+p.r*.6);
  if(p.i%5===0)glow(ctx,x,y,p.size*5,color,alpha*.5);
  ctx.fillStyle=rgba(color,alpha);ctx.beginPath();ctx.ellipse(x,y,p.size*.55,p.size*(exit?2.2:1.5),angle,0,TAU);ctx.fill();
 }
 ctx.restore();
}
function fireScene(back,front,state,res,color,exit){
 circle(back,state,color,exit);embers(back,state,res,color,false,exit);
 for(let i=0;i<15;i++){
  const angle=i*TAU/15+state.t*.35,x=200+Math.cos(angle)*112,y=233+Math.sin(angle)*28;
  const ctx=Math.sin(angle)>0?front:back;
  flame(ctx,x,y,.5+(.5+.5*Math.sin(i*2.3+state.t*19))*.7,state.t*24+i,color,state.envelope*.85);
 }
 embers(front,state,res,color,true,exit);
 // A rising heat veil has no hard rectangle or permanent backdrop.
 back.save();back.globalCompositeOperation='lighter';glow(back,200,202,92,color,state.charge*.14);back.restore();
}
export function prepareCloud(resources,canvas){
 const size=160;canvas.width=canvas.height=size;const ctx=canvas.getContext('2d'),image=ctx.createImageData(size,size);
 const hash=(x,y)=>{let n=(x*374761393+y*668265263)>>>0;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;};
 const noise=(x,y)=>{const ix=Math.floor(x),iy=Math.floor(y);let fx=x-ix,fy=y-iy;fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);return mix(mix(hash(ix,iy),hash(ix+1,iy),fx),mix(hash(ix,iy+1),hash(ix+1,iy+1),fx),fy);};
 const density=(x,y)=>noise(x*.018,y*.018)*.7+noise(x*.045+17,y*.045)*.22+noise(x*.1,y*.1+23)*.08;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const d=density(x,y),dx=(x-80)/78,dy=(y-80)/70,r=Math.sqrt(dx*dx+dy*dy);
  const mass=clamp((1-r+(d-.45)*.7)*2.6),light=clamp(.34+(d-density(x-4,y-6))*1.8+d*.24);
  const i=(y*size+x)*4;image.data[i]=24+light*45;image.data[i+1]=34+light*55;image.data[i+2]=49+light*70;image.data[i+3]=Math.round(mass*mass*(3-2*mass)*220);
 }
 ctx.putImageData(image,0,0);resources.cloudTexture=canvas;return resources;
}
function cloud(ctx,x,y,r,phase,alpha,front,texture){
 ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(phase)*.2);ctx.globalAlpha*=alpha;ctx.filter='blur(1.3px)';
 if(texture){ctx.scale(Math.sin(phase)>0?-1:1,1);ctx.drawImage(texture,-r*1.35,-r,r*2.7,r*2);}
 else {const g=ctx.createRadialGradient(0,-r*.2,0,0,0,r);g.addColorStop(0,'rgba(83,107,141,.65)');g.addColorStop(.6,'rgba(32,48,73,.4)');g.addColorStop(1,'rgba(25,39,66,0)');ctx.fillStyle=g;ctx.fillRect(-r,-r,r*2,r*2);}
 ctx.restore();
}
function lightning(ctx,points,strength,color){
 ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineJoin='round';
 const coords=points.map(p=>[p.x,p.y]);line(ctx,coords,rgba(color,strength*.18),9);line(ctx,coords,rgba(color,strength*.6),2.5);line(ctx,coords,`rgba(235,250,255,${strength})`,.85);
 for(let j=2;j<points.length-1;j+=3){const p=points[j],side=j%2?1:-1;line(ctx,[[p.x,p.y],[p.x+side*15,p.y+8],[p.x+side*8,p.y+20]],rgba(color,strength*.7),.8);}
 ctx.restore();
}
function stormScene(back,front,state,res,color,exit){
 const {t,envelope:e}=state;
 const cover=(exit?ease(.08,.38,t)*(1-ease(.78,1,t)):(1-ease(.52,.9,t)))*ease(0,.2,t);
 for(const c of res.clouds){
  const ctx=c.front?front:back;
  const swirl=t*1.8+c.phase,spread=1+(1-state.charge)*.3;
  const x=200+c.x*spread+Math.sin(swirl)*12,y=154+c.y+Math.cos(swirl*.7)*10;
  cloud(ctx,x,y,c.r,c.phase+t*.8,c.front?cover*.85:e*.85,c.front,res.cloudTexture);
 }
 for(let i=0;i<res.bolts.length;i++){
  const trigger=[.21,.29,.39,.55,.68][i],age=t-trigger;
  const power=age>=0&&age<.032?Math.pow(1-age/.032,2):0;
  if(power){lightning(i%2?front:back,res.bolts[i],power*.9,color);glow(back,200,115,150,color,power*.09);}
 }
 embers(back,state,res,color,false,exit);
 // Silver ribbons skim the cloud edge and peel outwards as the avatar emerges.
 front.save();front.globalCompositeOperation='lighter';
 for(let i=0;i<5;i++){
  const p=clamp((t-.3-i*.03)/.5);front.beginPath();front.moveTo(90+i*10,210-i*16);front.bezierCurveTo(30-p*20,180-i*9,300+p*25,190-i*22,300+i*6,145-i*6);front.strokeStyle=rgba(color,Math.sin(p*Math.PI)*.13);front.lineWidth=1;front.stroke();
 }
 front.restore();
}
// Animated tapered body, scale highlights, dorsal spines, antlers and whiskers;
// the serpentine guardian is drawn on its own moving spine, never a flat replacement avatar.
function serpentPoint(u,t){
 const angle=-.8+t*TAU*.95-u*TAU*1.1;
 const r=48+u*88;
 return {x:200+Math.cos(angle)*r,y:132+Math.sin(angle)*r*.58-u*12,z:Math.sin(angle)};
}
function serpent(back,front,t,alpha){
 const count=72,points=Array.from({length:count},(_,i)=>serpentPoint(i/(count-1),t));
 for(let i=0;i<count-1;i++){
  const p=points[i],n=points[i+1],ctx=p.z>0?front:back,width=2+Math.pow(i/(count-1),.7)*13;
  ctx.save();ctx.globalAlpha*=alpha;ctx.lineCap='round';line(ctx,[[p.x,p.y],[n.x,n.y]],'#082e2c',width+2);ctx.restore();
 }
 for(let i=0;i<count-1;i++){
  const p=points[i],n=points[i+1],ctx=p.z>0?front:back;
  const width=2+Math.pow(i/(count-1),.7)*13;
  ctx.save();ctx.globalAlpha*=alpha;ctx.lineCap='round';
  const g=ctx.createLinearGradient(p.x-width,p.y-width,p.x+width,p.y+width);g.addColorStop(0,'#0b3e35');g.addColorStop(.35,'#32b98b');g.addColorStop(.62,'#b3e8a7');g.addColorStop(1,'#125849');
  ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(n.x,n.y);ctx.strokeStyle=g;ctx.lineWidth=width;ctx.stroke();
  const a=Math.atan2(n.y-p.y,n.x-p.x);ctx.translate(p.x,p.y);ctx.rotate(a);
  // Every vertebra has its own plate and moving ridge silhouette.
  if(i%4===0){line(ctx,[[-2,-width*.3],[1,0],[-2,width*.3]],'rgba(5,45,36,.7)',.7);line(ctx,[[0,-width*.25],[3,0]],'rgba(212,255,182,.6)',.65);}
  if(i%3===0){ctx.beginPath();ctx.moveTo(-2,-width*.45);ctx.lineTo(-6,-width*.45-5);ctx.lineTo(4,-width*.48);ctx.fillStyle='#d4b96d';ctx.fill();}
  if(i===45||i===61){
   for(const side of [-1,1]){
    line(ctx,[[0,side*4],[-5,side*13],[4,side*18]],'#1c795a',4);
    line(ctx,[[0,side*4],[-5,side*13],[4,side*18]],'#8fca91',1.4);
    for(let toe=0;toe<3;toe++)line(ctx,[[3,side*18],[8+toe*2,side*(15+toe*3)],[11+toe*2,side*(14+toe*3)]],'#e9d7a1',.8);
   }
  }
  ctx.restore();
 }
 const head=points.at(-1),neck=points.at(-3),ctx=head.z>0?front:back;
 const angle=Math.atan2(head.y-neck.y,head.x-neck.x);ctx.save();ctx.translate(head.x,head.y);ctx.rotate(angle);ctx.globalAlpha*=alpha;
 // Flowing mane and beard break the silhouette into a recognizable guardian dragon.
 for(const side of [-1,1])for(let i=0;i<4;i++){
  ctx.beginPath();ctx.moveTo(-5-i*2,side*6);ctx.quadraticCurveTo(-14-i*2,side*(10+i),-25-i*2+Math.sin(t*15+i)*3,side*(8+i*3));ctx.strokeStyle=i%2?'#b6d4a0':'#eadab0';ctx.lineWidth=1.2;ctx.stroke();
 }
 // Antlers fork away from the skull rather than rotating a whole illustration.
 for(const side of [-1,1]){
  line(ctx,[[-4,side*5],[-14,side*15],[-24,side*17],[-29,side*23]],'#b7a771',2);
  line(ctx,[[-15,side*15],[-17,side*24]],'#e8dba3',1.3);
  line(ctx,[[-23,side*17],[-29,side*14]],'#d8c58c',1);
 }
 const g=ctx.createLinearGradient(-13,-10,14,10);g.addColorStop(0,'#8fd49b');g.addColorStop(.55,'#237e5c');g.addColorStop(1,'#0c4b40');
 ctx.beginPath();ctx.moveTo(-14,-7);ctx.quadraticCurveTo(2,-16,10,-7);ctx.lineTo(18,-4);ctx.lineTo(20,3);ctx.lineTo(10,7);ctx.quadraticCurveTo(-3,12,-14,7);ctx.closePath();ctx.fillStyle=g;ctx.fill();ctx.strokeStyle='#073b32';ctx.lineWidth=1.1;ctx.stroke();
 for(const side of [-1,1]){
  line(ctx,[[1,side*6],[7,side*4]],'#fff2b2',2);
  ctx.beginPath();ctx.moveTo(13,side*4);ctx.bezierCurveTo(25,side*10,18+Math.sin(t*9)*7,side*25,39,side*19);ctx.strokeStyle='#e1e8b9';ctx.lineWidth=.7;ctx.stroke();
 }
 line(ctx,[[10,3],[17,2]],'#061f1c',1);ctx.fillStyle='#f6eac7';for(const x of [10,15]){ctx.beginPath();ctx.moveTo(x,3);ctx.lineTo(x+1,6);ctx.lineTo(x+2,3);ctx.fill();}ctx.restore();
}
function beam(ctx,state,color,exit){
 const a=state.beam;if(a<=0)return;
 ctx.save();ctx.globalCompositeOperation='lighter';
 const g=ctx.createLinearGradient(0,0,0,248);g.addColorStop(0,rgba(color,0));g.addColorStop(.2,rgba(color,a*.08));g.addColorStop(.8,rgba(color,a*.24));g.addColorStop(1,rgba(color,0));ctx.fillStyle=g;
 ctx.beginPath();ctx.moveTo(192,0);ctx.lineTo(208,0);ctx.lineTo(244,245);ctx.lineTo(156,245);ctx.closePath();ctx.fill();
 for(let i=0;i<7;i++){
  const x=200+(i-3)*5+Math.sin(state.t*17+i)*2;
  const lineG=ctx.createLinearGradient(x,0,x,245);lineG.addColorStop(0,'rgba(255,255,230,0)');lineG.addColorStop(.35,`rgba(255,255,230,${a*(i===3?.75:.2)})`);lineG.addColorStop(1,rgba(color,0));
  ctx.fillStyle=lineG;ctx.fillRect(x,0,i===3?2:1,248);
 }
 const wave=(state.t*3)%1,y=exit?230-wave*220:wave*230;glow(ctx,200,y,35,color,a*.28);glow(ctx,200,225,95,color,a*.35);ctx.restore();
}
function celestialScene(back,front,state,res,color,exit){
 const {t,envelope:e}=state;
 back.save();back.translate(200,234);back.scale(1,.3);back.rotate(-t*.7);ellipseRing(back,110,1,rgba([221,205,127],e*.7));for(let i=0;i<16;i++)rune(back,i,102,i*TAU/16,e*.75,[221,205,127]);back.restore();
 serpent(back,front,exit?1-t:t,e*(1-ease(.65,.9,t)));
 beam(back,state,color,exit);beam(front,{...state,beam:state.beam*.3},[245,239,184],exit);
 embers(back,state,res,[239,216,128],false,exit);embers(front,state,res,color,true,exit);
}
function hackerScene(back,front,state,res,color,exit){
 const {t,envelope:e,reveal}=state,flow=exit?1-t:t;
 back.save();back.globalCompositeOperation='lighter';
 // Perspective circuit floor: a bounded virtual staging area, never a full-screen flash.
 back.save();back.translate(200,240);back.scale(1,.28);back.rotate(t*.22);
 for(let i=0;i<3;i++){const radius=75+i*23;back.setLineDash([5+i*2,7]);ellipseRing(back,radius,.8,rgba(color,e*(.5-i*.1)));}back.setLineDash([]);
 for(let i=0;i<12;i++){const a=i*TAU/12;line(back,[[Math.cos(a)*72,Math.sin(a)*72],[Math.cos(a)*102,Math.sin(a)*102],[Math.cos(a+.08)*126,Math.sin(a+.08)*126]],rgba(color,e*.5),1);}
 back.restore();
 // Deterministic short code streams at the flanks; quality/density controls their count.
 back.font='7px monospace';back.textAlign='center';
 for(let i=0;i<res.particles.length;i++){
  const p=res.particles[i],side=i%2?1:-1,x=200+side*(76+p.r*74),y=35+((p.phase+t*p.speed*.8)%1)*205;
  const fade=Math.sin((y-35)/205*Math.PI)*e*(.25+p.r*.55);back.fillStyle=rgba(color,fade);
  back.fillText(['01','{ }','0x','//','<>','10'][i%6],x,y);
  if(i%7===0)line(back,[[x,y+4],[x+side*10,y+4],[x+side*10,y+18]],rgba(color,fade*.6),.6);
 }
 glow(back,200,175,105,color,e*.16);back.restore();
 front.save();front.globalCompositeOperation='lighter';
 const scan=236-reveal*191;
 // Two scanning rails reveal the real Puppet through its existing materialization mask.
 const beam=front.createLinearGradient(0,scan-10,0,scan+10);beam.addColorStop(0,rgba(color,0));beam.addColorStop(.5,rgba(color,e*.25));beam.addColorStop(1,rgba(color,0));front.fillStyle=beam;front.fillRect(80,scan-10,240,20);
 line(front,[[80,scan],[320,scan]],rgba(color,e*.85),1.2);
 for(const side of [-1,1]){const x=200+side*128;line(front,[[x-side*15,48],[x,48],[x,69]],rgba(color,e*.65),1.2);line(front,[[x-side*15,235],[x,235],[x,214]],rgba(color,e*.65),1.2);}
 // Fine holographic slices and chips track the scan instead of obscuring the whole avatar.
 for(let i=0;i<12;i++){const p=res.particles[i],x=90+p.r*220,y=scan+(p.phase-.5)*48,w=5+p.r*16;front.fillStyle=rgba(color,e*(1-Math.abs(y-scan)/30)*.25);front.fillRect(x,y,w,1.2);}
 const progress=ease(.12,.72,flow);front.fillStyle=rgba(color,e*.18);front.fillRect(145,255,110,2);front.fillStyle=rgba(color,e*.8);front.fillRect(145,255,110*progress,2);
 front.font='6px monospace';front.textAlign='center';front.fillStyle=rgba(color,e*.75);front.fillText(exit?'SESSION CLOSED':flow<.45?'INITIALIZING AVATAR':flow<.72?'ASSEMBLING MESH':'AVATAR ONLINE',200,269);
 front.restore();
}
export function paintScene(kind,back,front,state,resources,exit,intensity=1,colorOverride=null,scale=1){
 for(const ctx of [back,front]){ctx.clearRect(0,0,400,300);ctx.save();ctx.globalAlpha=intensity;ctx.translate(200,150);ctx.scale(scale,scale);ctx.translate(-200,-150);}
 const color=colorOverride||cinematicPresets[kind].color;
 if(kind==='hacker')hackerScene(back,front,state,resources,color,exit);
 else if(kind==='summon')fireScene(back,front,state,resources,color,exit);
 else if(kind==='tempest')stormScene(back,front,state,resources,color,exit);
 else celestialScene(back,front,state,resources,color,exit);
 for(const ctx of [back,front])ctx.restore();
}
export function runCinematic(view,kind,exit,duration,slot,animate){
 // A non-browser probe or missing canvas still retains real actor entry/exit.
 if(!view.fx||!view.fxFront||typeof document==='undefined')return animate(view,view.actor,[{opacity:exit?1:0},{opacity:exit?0:1}],{duration});
 const preset=cinematicPresets[kind],quality=slot.transitionQuality||'medium';
 const color=/^#[0-9a-f]{6}$/i.test(slot.transitionColor||'')?[1,3,5].map(i=>parseInt(slot.transitionColor.slice(i,i+2),16)):preset.color;
 const canvases=[document.createElement('canvas'),document.createElement('canvas')];
 const pixels=effectRaster(view,quality);
 for(const canvas of canvases){canvas.width=pixels.width;canvas.height=pixels.height;canvas.className='cinematic-canvas';canvas.setAttribute('aria-hidden','true');}
 const contexts=canvases.map(c=>c.getContext('2d',{alpha:true}));
 if(contexts.some(c=>!c))return animate(view,view.actor,[{opacity:exit?1:0},{opacity:exit?0:1}],{duration});
 contexts.forEach(c=>c.setTransform(pixels.width/400,0,0,pixels.height/300,0,0));view.fx.append(canvases[0]);view.fxFront.append(canvases[1]);
 const res=sceneResources(preset.seed,quality,slot.transitionDensity??.75);if(kind==='tempest')prepareCloud(res,document.createElement('canvas'));
 const start=performance.now();let raf=0,timer=0,finished=false,resolve;
 const complete=new Promise(r=>resolve=r),nameVisibility=view.name?.style?.visibility||'';
 function reveal(value){
  view.puppet?.setMaterialization(value,color);
  if(!view.puppet&&view.body?.style)view.body.style.clipPath=`inset(${(1-value)*100}% 0 0 0)`;
  if(view.name?.style)view.name.style.visibility=value<.7?'hidden':nameVisibility;
 }
 function stop(){
  if(finished)return;finished=true;cancelAnimationFrame(raf);clearTimeout(timer);canvases.forEach(c=>c.remove());
  view.puppet?.setMaterialization(1,color,false);if(view.body?.style)view.body.style.clipPath='';if(view.name?.style)view.name.style.visibility=nameVisibility;
  if(view.stopCinematic===stop)view.stopCinematic=null;resolve();
 }
 view.stopCinematic=stop;
 function frame(now){
  if(finished)return;const t=clamp((now-start)/duration),state=sceneState(kind,t,exit);
  applyEffectRaster(canvases,contexts,view,quality);
  reveal(state.reveal);
  try{paintScene(kind,contexts[0],contexts[1],state,res,exit,slot.transitionIntensity??.8,color,slot.transitionScale??1);}catch(error){console.error('VtuberFriends VFX:',error);stop();return;}
  if(t<1)raf=requestAnimationFrame(frame);else stop();
 }
 reveal(exit?1:0);raf=requestAnimationFrame(frame);timer=setTimeout(stop,duration+100);
 const actorFrames=exit?[
  {transform:'translateY(0) scale(1)',opacity:1,offset:0},
  {transform:'translateY(-2px) scale(1.015)',opacity:1,offset:.2},
  {transform:'translateY(-12px) scale(.94)',opacity:0,offset:.78},
  {transform:'translateY(-12px) scale(.94)',opacity:0,offset:1}
 ]:[
  {transform:'translateY(10px) scale(.93)',opacity:0,offset:0},
  {transform:'translateY(10px) scale(.93)',opacity:0,offset:kind==='celestial'?.47:.3},
  {transform:'translateY(-2px) scale(1.025)',opacity:1,offset:.8},
  {transform:'translateY(0) scale(1)',opacity:1,offset:1}
 ];
 return Promise.all([complete,animate(view,view.actor,actorFrames,{duration})]);
}
