import {cinematicPresets,runCinematic} from './vfx/cinematic.js?v=__UI_VERSION__';
export const animationRegistry = new Map();
export function registerAnimation(id, definition) { animationRegistry.set(id, definition); }
const popIn=[
 {transform:'scale(.015)',opacity:0,offset:0},
 {transform:'scale(.10)',opacity:1,offset:.12},
 {transform:'scale(1.10)',opacity:1,offset:.57},
 {transform:'scale(.955)',opacity:1,offset:.76},
 {transform:'scale(1.018)',opacity:1,offset:.9},
 {transform:'scale(1)',opacity:1,offset:1}
];
const popOut=[
 {transform:'scale(1)',opacity:1,offset:0},
 {transform:'scale(1.055)',opacity:1,offset:.18},
 {transform:'scale(.92)',opacity:1,offset:.38},
 {transform:'scale(.025)',opacity:.6,offset:.88},
 {transform:'scale(.001)',opacity:0,offset:1}
];
registerAnimation('none',{label:'Sin animación',entry:[],exit:[],duration:0});
registerAnimation('pop',{label:'Pop elástico',entry:popIn,exit:popOut,duration:620,exitDuration:440});
registerAnimation('fire',{label:'Llamas de dragón',entry:popIn,exit:popOut,duration:760,exitDuration:600,fire:true});

for(const [id,preset]of Object.entries(cinematicPresets))registerAnimation(id,{...preset,cinematic:id});

function cancelVisual(view){
 view.stopCinematic?.();
 view.fxFront?.replaceChildren();
 for(const animation of view.animations||[])animation.cancel();
 view.animations=[];view.fx?.replaceChildren();
 if(view.audio){view.audio.pause();view.audio=null;}
}
function animate(view,node,frames,options){
 if(!node?.animate)return Promise.resolve();
 const animation=node.animate(frames,{fill:'both',easing:'cubic-bezier(.22,.7,.3,1)',...options});
 view.animations.push(animation);
 return animation.finished.catch(()=>{});
}
function flourish(view,fire,exit,duration){
 if(!view.fx)return [];
 const jobs=[];
 const ring=document.createElement('div');ring.className='presence-ring';view.fx.append(ring);
 jobs.push(animate(view,ring,[{transform:'translate(-50%,-50%) scale(.1)',opacity:0},{transform:'translate(-50%,-50%) scale(.65)',opacity:.6,offset:.25},{transform:'translate(-50%,-50%) scale(1.25)',opacity:0}],{duration:fire?850:330,delay:exit?duration*.65:30}));
 if(!fire)return jobs;
 const ns='http://www.w3.org/2000/svg';
 const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 400 300');svg.classList.add('flame-bloom');
 for(let i=0;i<9;i++){
  const angle=(i/9)*Math.PI*2;
  const x=200+Math.cos(angle)*88,y=153+Math.sin(angle)*63;
  const group=document.createElementNS(ns,'g');group.setAttribute('transform','translate('+x+' '+y+') rotate('+(i*40+15)+')');
  const flame=document.createElementNS(ns,'path');
  flame.setAttribute('d','M0 25C-21 8-16-7-5-19C-8-4 6-5 2-37C24-15 25 9 0 25Z');
  flame.setAttribute('fill',i%2?'#dc9f57':'#edc88b');flame.style.transformBox='fill-box';flame.style.transformOrigin='center';
  group.append(flame);svg.append(group);
  jobs.push(animate(view,flame,[{opacity:0,transform:'translateY(12px) scale(.15)'},{opacity:.75,transform:'translateY(0) scale(.8)',offset:.35},{opacity:.4,transform:'translateY(-12px) scale(1)',offset:.65},{opacity:0,transform:'translateY(-24px) scale(.25)'}],{duration:650,delay:i*27+(exit?170:0)}));
 }
 view.fx.append(svg);
 for(let i=0;i<12;i++){
  const ember=document.createElement('i');ember.className='presence-ember';view.fx.append(ember);
  const angle=i*2.399, radius=48+(i%4)*13, x=Math.cos(angle)*radius, y=Math.sin(angle)*radius*.7;
  jobs.push(animate(view,ember,[{opacity:0,transform:'translate(0,25px) scale(.2)'},{opacity:.9,offset:.3},{opacity:0,transform:'translate('+x+'px,'+(y-45)+'px) scale(.25)'}],{duration:750,delay:i*23}));
 }
 return jobs;
}
export function soundUrl(slot,direction){
 const sound=direction==='entry'?slot.entrySound:slot.exitSound;
 if(!sound||sound==='builtin')return '/media/default-'+direction+'.wav';
 if(sound==='none')return null;
 return '/media/sounds/'+encodeURIComponent(sound);
}
export async function playSound(view,slot,direction){
 const url=soundUrl(slot,direction);
 if(!url||(slot.soundVolume??.45)<=0)return true;
 const audio=new Audio(url);audio.volume=slot.soundVolume??.45;view.audio=audio;
 try{await audio.play();return true;}
 catch{document.dispatchEvent(new CustomEvent('vf-audio-blocked'));return false;}
}
export async function runTransition(view,slot,direction,{silent=false}={}){
 cancelVisual(view);
 view.onTransition?.(direction);
 const serial=view.transitionSerial=(view.transitionSerial||0)+1;
 const id=direction==='entry'?(slot.entryAnimation||'pop'):(slot.exitAnimation||'pop');
 const definition=animationRegistry.get(id)||animationRegistry.get('pop');
 if(!silent)void playSound(view,slot,direction);
 if(!definition.duration)return serial;
 const exit=direction==='exit',duration=exit?(definition.exitDuration||definition.duration):definition.duration;
 const speed=Math.max(.6,Math.min(1.5,slot.transitionSpeed??1));
 const jobs=definition.cinematic?[runCinematic(view,definition.cinematic,exit,duration/speed,slot,animate)]:flourish(view,!!definition.fire,exit,duration);
 if(!definition.cinematic)jobs.push(animate(view,view.actor,exit?definition.exit:definition.entry,{duration,delay:definition.fire&&!exit?130:0}));
 await Promise.all(jobs);
 if(serial===view.transitionSerial){
  for(const animation of view.animations)animation.cancel();
  view.animations=[];view.fx?.replaceChildren();view.fxFront?.replaceChildren();
 }
 return serial;
}
export function stopTransitions(view){view.transitionSerial=(view.transitionSerial||0)+1;cancelVisual(view);view.wanted=false;}
export function setPresence(view,wanted,slot,{instant=false,silent=false}={}){
 if(!view.actor){view.container.classList.toggle('is-hidden',!wanted);return;}
 const key=slot?.userId||null;
 const changed=view.wanted!==wanted||(wanted&&view.presenceKey!==key);
 if(!changed)return;
 const previous=view.wanted;
 view.wanted=wanted;view.presenceKey=key;
 if(instant||previous===undefined&&!wanted){
  view.transitionSerial=(view.transitionSerial||0)+1;cancelVisual(view);
  view.container.classList.toggle('is-hidden',!wanted);return;
 }
 if(wanted){
  view.container.classList.remove('is-hidden');
  void runTransition(view,slot,'entry',{silent});
 }else if(previous){
  void runTransition(view,slot,'exit',{silent}).then(serial=>{
   if(serial===view.transitionSerial&&!view.wanted)view.container.classList.add('is-hidden');
  });
 }else view.container.classList.add('is-hidden');
}
export async function previewTransition(view,slot,direction){
 view.container.classList.remove('is-hidden');
 const serial=await runTransition(view,slot,direction);
 if(serial!==view.transitionSerial)return;
 // Preview tests do not change source visibility or persistent settings.
 view.container.classList.toggle('is-hidden',!slot.userId);
}
