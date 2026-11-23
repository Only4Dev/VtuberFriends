import {effectRaster,applyEffectRaster} from '../raster.js?v=__UI_VERSION__';
// Persistent decorations share one clock and have no audio side effects.
export const ambientRegistry=Object.freeze({runes:'Runas flotantes',orbs:'Orbes de energía',embers:'Brasas etéreas',wind:'Corrientes de viento'});
const TAU=Math.PI*2,clamp=x=>Math.max(0,Math.min(1,x));
const rgba=(c,a)=>`rgba(${c[0]},${c[1]},${c[2]},${clamp(a)})`;
export function ambientPool(seed=1){let n=seed;const rand=()=>{n^=n<<13;n^=n>>>17;n^=n<<5;return (n>>>0)/4294967296;};return Array.from({length:48},(_,i)=>({phase:rand(),angle:rand()*TAU,r:rand(),size:.7+rand()*1.4,i}));}
function glow(ctx,x,y,r,color,alpha){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,rgba(color,alpha));g.addColorStop(.3,rgba(color,alpha*.3));g.addColorStop(1,rgba(color,0));ctx.fillStyle=g;ctx.fillRect(x-r,y-r,2*r,2*r);}
function stroke(ctx,points,color,width){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
function glyph(ctx,x,y,angle,size,index,color,alpha){
 ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(size,size);ctx.lineCap='round';ctx.lineWidth=.9;ctx.strokeStyle=rgba(color,alpha);
 ctx.beginPath();ctx.moveTo(0,-5);ctx.lineTo(0,5);ctx.moveTo(-3,-1);ctx.lineTo(0,-5);ctx.lineTo(3,-1);
 if(index%2){ctx.moveTo(-3,3);ctx.lineTo(0,0);ctx.lineTo(3,3);}else{ctx.moveTo(-3,0);ctx.lineTo(-3,4);ctx.lineTo(3,4);ctx.lineTo(3,0);}ctx.stroke();ctx.restore();
}
function runes(back,front,time,a,color,size){
 const radius=a.radius*size;
 for(let i=0;i<16;i++){
  const angle=time*.2+i*TAU/16,depth=Math.sin(angle),ctx=depth>0?front:back;
  const x=a.center.x+Math.cos(angle)*radius,y=a.center.y+depth*radius*.37;
  glow(ctx,x,y,9*size,color,.07);glyph(ctx,x,y,Math.sin(angle)*.25,size*(.7+(depth+1)*.12),i,color,.45+(depth+1)*.12);
 }
}
function orbs(back,front,time,a,color,size,quality){
 const count=quality==='low'?3:4,radius=a.radius*size*1.1;
 for(let i=0;i<count;i++){
  const angle=time*.45+i*TAU/count,depth=Math.sin(angle),ctx=depth>0?front:back;
  const x=a.center.x+Math.cos(angle)*radius,y=a.center.y+depth*radius*.36+Math.sin(time*.6+i)*7;
  const r=(5.3+depth)*size;glow(ctx,x,y,r*5,color,.32);
  const g=ctx.createRadialGradient(x-r*.3,y-r*.4,0,x,y,r);g.addColorStop(0,'rgba(255,255,247,.95)');g.addColorStop(.3,rgba(color,.9));g.addColorStop(1,rgba(color,.1));ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();
  ctx.save();ctx.translate(x,y);ctx.rotate(time+i);ctx.scale(1,.45);ctx.beginPath();ctx.ellipse(0,0,r*1.8,r*1.8,0,.2,TAU-1);ctx.strokeStyle=rgba(color,.65);ctx.lineWidth=.8;ctx.stroke();ctx.restore();
  const points=[];for(let j=0;j<10;j++){const p=angle-j*.028;points.push({x:a.center.x+Math.cos(p)*radius,y:a.center.y+Math.sin(p)*radius*.36+Math.sin(time*.6+i)*7});}stroke(ctx,points,rgba(color,.17),1.5);
 }
}
function embers(back,front,time,a,color,size,pool,quality){
 const count=quality==='low'?16:quality==='high'?40:26;
 for(let i=0;i<count;i++){
  const p=pool[i],life=(time*(.09+p.r*.07)+p.phase)%1,ctx=i%3===0?front:back;
  const x=a.body.x+Math.cos(p.angle+life*2)*a.radius*(.3+p.r*.7)*size+Math.sin(time+p.angle)*4;
  const y=a.body.y+18-life*a.radius*1.9*size,alpha=Math.sin(life*Math.PI)*.65;
  if(i%4===0)glow(ctx,x,y,9*size,color,alpha*.2);
  ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(time+p.phase)*.5);ctx.beginPath();ctx.moveTo(0,-p.size*3*size);ctx.quadraticCurveTo(p.size*size,0,0,p.size*size);ctx.quadraticCurveTo(-p.size*size,0,0,-p.size*3*size);ctx.fillStyle=rgba(color,alpha);ctx.fill();ctx.restore();
 }
}
function wind(back,front,time,a,color,size){
 for(let k=0;k<3;k++){
  const offset=time*.4+k*1.7;let points=[],lastFront=null;
  for(let j=0;j<=48;j++){
   const angle=offset+j/48*TAU*.7,depth=Math.sin(angle),isFront=depth>0;
   const point={x:a.body.x+Math.cos(angle)*a.radius*size*(1.05+k*.06),y:a.body.y-18-k*12+depth*a.radius*.26*size+Math.sin(angle*2+time*.5)*7};
   if(lastFront!==null&&isFront!==lastFront){points.push(point);stroke(lastFront?front:back,points,rgba(color,.13+k*.025),.65+k*.15);points=[point];}else points.push(point);lastFront=isFront;
  }
  if(points.length>1)stroke(lastFront?front:back,points,rgba(color,.13+k*.025),.65+k*.15);
 }
}
// Full-orbit envelopes include glows, not just particle centers. The fit is independent of phase.
export function ambientViewport(anchors,settings){
 const {center:c,body:b,radius:r}=anchors,s=settings.size??1,boxes=[];
 for(const effect of settings.effects){
  if(effect==='runes')boxes.push([c.x-r*s-10*s,c.y-r*s*.37-10*s,c.x+r*s+10*s,c.y+r*s*.37+10*s]);
  if(effect==='orbs')boxes.push([c.x-r*s*1.1-32*s,c.y-r*s*.396-32*s-7,c.x+r*s*1.1+32*s,c.y+r*s*.396+32*s+7]);
  if(effect==='embers'){const p=4+9*s;boxes.push([b.x-r*s-p,b.y+18-r*s*1.9-p,b.x+r*s+p,b.y+18+p]);}
  if(effect==='wind')boxes.push([b.x-r*s*1.17-2,b.y-42-r*s*.26-9,b.x+r*s*1.17+2,b.y-18+r*s*.26+9]);
 }
 if(!boxes.length)return {scale:1,dx:0,dy:0,cx:c.x,cy:c.y,bounds:[c.x,c.y,c.x,c.y]};
 const minX=Math.min(...boxes.map(b=>b[0])),minY=Math.min(...boxes.map(b=>b[1])),maxX=Math.max(...boxes.map(b=>b[2])),maxY=Math.max(...boxes.map(b=>b[3]));
 const scale=Math.min(1,384/Math.max(1,maxX-minX),284/Math.max(1,maxY-minY));
 let x0=c.x+(minX-c.x)*scale,y0=c.y+(minY-c.y)*scale,x1=c.x+(maxX-c.x)*scale,y1=c.y+(maxY-c.y)*scale;
 const dx=x0<8?8-x0:x1>392?392-x1:0,dy=y0<8?8-y0:y1>292?292-y1:0;
 return {scale,dx,dy,cx:c.x,cy:c.y,bounds:[x0+dx,y0+dy,x1+dx,y1+dy]};
}
export function paintAmbient(back,front,time,anchors,settings,pool){
 const color=/^#[0-9a-f]{6}$/i.test(settings.color)?[1,3,5].map(i=>parseInt(settings.color.slice(i,i+2),16)):[134,216,239];
 const fit=ambientViewport(anchors,settings);
 for(const ctx of [back,front]){ctx.clearRect(0,0,400,300);ctx.save();ctx.translate(fit.cx+fit.dx,fit.cy+fit.dy);ctx.scale(fit.scale,fit.scale);ctx.translate(-fit.cx,-fit.cy);ctx.globalAlpha=settings.intensity??.65;ctx.globalCompositeOperation='lighter';}
 const size=settings.size??1;
 for(const effect of settings.effects){
  if(effect==='runes')runes(back,front,time,anchors,color,size);
  else if(effect==='orbs')orbs(back,front,time,anchors,color,size,settings.quality);
  else if(effect==='embers')embers(back,front,time,anchors,color,size,pool,settings.quality);
  else if(effect==='wind')wind(back,front,time,anchors,color,size);
 }
 for(const ctx of [back,front])ctx.restore();
}
const live=new Set();let raf=0,last=0;
function schedule(){if(!raf&&live.size)raf=requestAnimationFrame(frame);}
function frame(now){raf=0;const dt=last?Math.min(.05,(now-last)/1000):1/60;last=now;for(const layer of live)layer.frame(dt);if(live.size)schedule();else last=0;}
export class AmbientLayer{
 constructor(view){this.view=view;this.pool=ambientPool(97);this.time=0;this.visible=true;this.opacity=0;this.settings={effects:[]};this.observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{this.visible=entries[0]?.isIntersecting!==false;this.sync();}):null;this.observer?.observe(view.container);}
 update(slot,active){
  this.active=active;this.settings={effects:(slot.ambientEffects||[]).filter(id=>id in ambientRegistry),color:slot.ambientColor||'#86d8ef',intensity:slot.ambientIntensity??.65,size:slot.ambientSize??1,speed:slot.ambientSpeed??.7,quality:slot.ambientQuality||'medium'};
  if(!this.settings.effects.length||!active||this.settings.intensity<=0){this.release();return;}
  if(!this.canvases||this.quality!==this.settings.quality){this.release();this.create();}
  const body=this.view.body.getBoundingClientRect(),actor=this.view.actor.getBoundingClientRect();
  if(actor.width&&actor.height)this.region={x:(body.left-actor.left)/actor.width*400,y:(body.top-actor.top)/actor.height*300,w:body.width/actor.width*400,h:body.height/actor.height*300};
  if(this.canvases)applyEffectRaster(this.canvases,this.contexts,this.view,this.settings.quality);
  this.sync();
 }
 create(){
  this.quality=this.settings.quality;const size=effectRaster(this.view,this.quality);
  this.canvases=[document.createElement('canvas'),document.createElement('canvas')];this.contexts=this.canvases.map(c=>{c.className='ambient-canvas';c.width=size.width;c.height=size.height;c.setAttribute('aria-hidden','true');const ctx=c.getContext('2d');ctx?.setTransform(size.width/400,0,0,size.height/300,0,0);return ctx;});
  if(this.contexts.some(c=>!c)){this.release();return;}
  this.canvases[0].classList.add('ambient-back');this.canvases[1].classList.add('ambient-front');for(const c of this.canvases)this.view.actor.append(c);
 }
 sync(){if(this.active&&this.visible&&this.canvases){live.add(this);schedule();}else{live.delete(this);this.clear();}}
 clear(){this.contexts?.forEach(c=>c?.clearRect(0,0,400,300));}
 release(){live.delete(this);if(!live.size&&raf){cancelAnimationFrame(raf);raf=0;last=0;}this.canvases?.forEach(c=>c.remove());this.canvases=null;this.contexts=null;this.opacity=0;}
 anchors(){
  const r=this.region||{x:50,y:60,w:300,h:200};
  const point=(name,fallback)=>{const p=this.view.puppet?.anchor(name)||fallback;return {x:r.x+p.x*r.w,y:r.y+p.y*r.h};};
  const body=point('body',{x:.5,y:.78}),crown=point('crown',{x:.5,y:.15});
  return {body,center:{x:(crown.x+body.x)/2,y:(crown.y+body.y)/2},radius:r.w*.31,hornLeft:point('hornLeft',{x:.28,y:.15}),hornRight:point('hornRight',{x:.72,y:.15})};
 }
 frame(dt){
  if(globalThis.document?.hidden){this.clear();return;}
  const ready=!this.view.stopCinematic&&!(this.view.animations?.length);
  this.opacity+=((ready?1:0)-this.opacity)*(1-Math.exp(-dt/.3));
  if(this.opacity<.005){this.clear();return;}
  this.time+=dt*this.settings.speed;
  try{paintAmbient(this.contexts[0],this.contexts[1],this.time,this.anchors(),{...this.settings,intensity:this.settings.intensity*this.opacity},this.pool);}catch(error){console.error('VtuberFriends ambient:',error);this.release();}
 }
 dispose(){this.release();this.observer?.disconnect();}
}
