import {puppetPacks,isPuppet} from './puppet/packs.js?v=__UI_VERSION__';
import {AmbientLayer} from './vfx/ambient.js?v=__UI_VERSION__';
import {PuppetAvatar} from './puppet/player.js?v=__UI_VERSION__';
import {setPresence,stopTransitions} from './transitions.js?v=__UI_VERSION__';
export const palettes = {
 ...puppetPacks,
  bronze: {name:'Bronce', skin:'#ae7951', light:'#d7ae7a', horn:'#f0dfb9', eye:'#f4dc97'},
  ivory: {name:'Marfil', skin:'#d5cbbb', light:'#f1e8d7', horn:'#8a7257', eye:'#a97c3e'},
  moss: {name:'Musgo', skin:'#667767', light:'#aab795', horn:'#dac7a0', eye:'#f2cf89'},
  slate: {name:'Pizarra', skin:'#697583', light:'#aab8c0', horn:'#e0d6bd', eye:'#b9e5dc'}
};
export function dragonSvg(kind='bronze') {
  const p=palettes[kind]||palettes.bronze;
  return '<svg class="dragon" viewBox="0 0 240 230" aria-hidden="true">'+
  '<path d="M47 119 23 68 67 86 77 34 104 76 136 76 163 34 173 86 217 68 193 119" fill="'+p.horn+'" stroke="#302c28" stroke-width="5" stroke-linejoin="round"/>'+
  '<path d="M62 96Q120 61 178 96L190 154Q182 195 120 208Q58 195 50 154Z" fill="'+p.skin+'" stroke="#302c28" stroke-width="5"/>'+
  '<path d="M76 111 104 121M164 111 136 121" stroke="#302c28" stroke-width="9" stroke-linecap="round"/>'+
  '<path d="M78 125 99 131M162 125 141 131" stroke="'+p.eye+'" stroke-width="6" stroke-linecap="round"/>'+
  '<path d="M81 151Q120 137 159 151L165 177Q120 201 75 177Z" fill="'+p.light+'"/>'+
  '<path d="M101 157h1m36 0h1" stroke="#43352e" stroke-width="6" stroke-linecap="round"/>'+
  '<path class="mouth-closed" d="M100 176Q120 182 140 176" fill="none" stroke="#43352e" stroke-width="4" stroke-linecap="round"/>'+
  '<ellipse class="mouth-open" cx="120" cy="177" rx="15" ry="12" fill="#392f2a"/>'+
  '<path d="m109 167 5 7 4-7m7 0 4 7 4-7" class="mouth-open" fill="'+p.horn+'"/>'+
  '<path d="M92 209 77 227h86l-15-18" fill="'+p.skin+'" stroke="#302c28" stroke-width="4"/>'+
  '</svg>';
}
export function mountAvatar(container) {
  container.innerHTML='<div class="avatar-stage"><div class="presence-fx"></div><div class="presence-actor"><div class="avatar-content"><div class="avatar-name"></div><div class="avatar-body"></div></div></div><div class="presence-fx-front"></div></div>';
  // Use the same 400 x 300 design in both the panel and any browser-source viewport.
  const resize = () => {
    const bounds = container.getBoundingClientRect();
    const scale = Math.max(0, Math.min(bounds.width / 400, bounds.height / 300));
    container.style.setProperty('--viewport-scale', String(scale));
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container); resize();
  const view={container,actor:container.querySelector('.presence-actor'),fx:container.querySelector('.presence-fx'),fxFront:container.querySelector('.presence-fx-front'),body:container.querySelector('.avatar-body'),name:container.querySelector('.avatar-name'),kind:null,until:0};
  view.resizeObserver=observer;view.ambient=new AmbientLayer(view);return view;
}
export function paintAvatar(view,slot,participant,level,options={}) {
  const now=performance.now(), fresh=options.fresh!==false;
  const present=participant?.present===true;
  const visible=!!slot?.userId && (options.preview || (slot.enabled && present && options.connected));
  if(!visible)setPresence(view,false,slot,{instant:options.instant||!fresh,silent:options.silent});
  if(!visible){view.ambient?.update(slot,false);view.puppet?.update(0,slot,false);view.until=0;return;}
  if(view.kind!==slot.avatar){
   view.puppet?.dispose();view.puppet=null;
   view.body.classList?.toggle('puppet-body',isPuppet(slot.avatar));
   if(isPuppet(slot.avatar))view.puppet=new PuppetAvatar(view.body,slot.avatar);
   else view.body.innerHTML=dragonSvg(slot.avatar);
   view.kind=slot.avatar;
  }
  const rms=fresh&&present ? (level?.rms||0):0;
  view.puppet?.update(rms,slot,visible&&fresh,level?.frames);
  view.ambient?.update(slot,visible&&fresh);
  const above=rms>0 && 20*Math.log10(rms)>=slot.thresholdDb;
  if(above)view.until=now+slot.holdMs;
  const speaking=fresh&&present&&(above||now<view.until);
  view.container.classList.toggle('talking',speaking&&!view.puppet);
  view.container.style.opacity=String(slot.opacity);
  view.container.style.setProperty('--avatar-scale',slot.scale);
  view.name.textContent=participant?.name||'Fuera del canal';
  view.name.hidden=!slot.showName;
  view.name.classList?.toggle('outline',slot.nameStyle==='outline');
  if(view.name.style)view.name.style.opacity=String(slot.nameOpacity??1);
  const fontSize=slot.nameSize??17;
  view.container.style.setProperty('--name-size',fontSize+'px');
  const height=(view.puppet?200:163)*slot.scale+(slot.showName?Math.max(32,fontSize*1.25+10)+10:0);
  const width=(view.puppet?300:170)*slot.scale,fit=Math.min(1,258/height,364/width);
  view.container.style.setProperty('--content-fit',fit);
  const bounds=view.container.getBoundingClientRect?.();
  const viewportScale=bounds?.width>0&&bounds?.height>0?Math.min(bounds.width/400,bounds.height/300):1;
  view.puppet?.setResolution(300*slot.scale*fit*viewportScale);
  if(view.puppet?.status==='loading'&&!view.wanted){setPresence(view,false,slot,{instant:true,silent:true});return;}
  setPresence(view,true,slot,{instant:options.preview||options.instant,silent:options.silent||options.preview});
}

export function suspendAvatar(view){
 stopTransitions(view);view.ambient?.release();view.puppet?.dispose();view.puppet=null;view.kind=null;view.until=0;
 view.body.replaceChildren();view.container.classList.add('is-hidden');
}

export function disposeAvatar(view){suspendAvatar(view);view.resizeObserver?.disconnect();}
