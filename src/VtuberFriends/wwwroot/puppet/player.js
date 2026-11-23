import {puppetPacks} from './packs.js?v=__UI_VERSION__';
import {addAccessories,loadAccessoryCatalog} from './accessories.js?v=__UI_VERSION__';
import {rasterSize} from '../raster.js?v=__UI_VERSION__';
import {projectAnchor} from './anchors.js?v=__UI_VERSION__';
import {AvatarBehaviorController,P,ParameterNames} from './controllers.js?v=__UI_VERSION__';
import {PuppetRig} from './rig.js?v=__UI_VERSION__';
import {PuppetRenderer} from './renderer.js?v=__UI_VERSION__';
const version='__UI_VERSION__';
const packs=new Map(),players=new Set();
let raf=0,lastFrame=0,instance=0;
function schedule(){if(!raf)raf=requestAnimationFrame(frame);}
function frame(now){
 raf=0;const dt=lastFrame?Math.min(.05,(now-lastFrame)/1000):1/60;lastFrame=now;
 for(const player of players)if((player.active||player.materializing)&&player.onScreen&&!document.hidden)player.frame(dt);
 if(players.size)schedule();else lastFrame=0;
}
async function loadPack(kind){
 const url='/puppets/'+puppetPacks[kind].id+'/';
 if(!packs.has(url))packs.set(url,(async()=>{
  const response=await fetch(url+'rig.json?v='+version);if(!response.ok)throw Error('No se encontró rig.json.');
  const manifest=await response.json();const accessories=addAccessories(manifest,await loadAccessoryCatalog());new PuppetRig(manifest);
  const images=new Map(),decoded=new Map();
  images.load=async src=>{
   if(images.has(src))return images.get(src);const location=accessories.get(src)??url+src+'?v='+version;
   if(!decoded.has(location))decoded.set(location,(async()=>{const image=new Image();image.src=location;await image.decode();
    if(typeof createImageBitmap!=='function')return image;
    const ratio=Math.min(1,(manifest.textureMax||768)/Math.max(image.naturalWidth,image.naturalHeight));
    return createImageBitmap(image,{resizeWidth:Math.max(1,Math.round(image.naturalWidth*ratio)),resizeHeight:Math.max(1,Math.round(image.naturalHeight*ratio)),resizeQuality:'high',premultiplyAlpha:'premultiply'});
   })());
   const image=await decoded.get(location);images.set(src,image);return image;
  };
  await Promise.all([...new Set(manifest.parts.filter(p=>p.kind!=='solid'&&!p.accessory).map(p=>p.src))].map(images.load));
  return {manifest,images};
 })().catch(error=>{packs.delete(url);throw error;}));
 return packs.get(url);
}
export class PuppetAvatar{
 constructor(container,kind='cyan-puppet'){
  this.kind=kind;
  this.container=container;this.active=false;this.onScreen=true;this.status='loading';this.disposed=false;this.frameCount=0;
  this.input={rms:0,thresholdDb:-60,idle:.55,wings:.5,mouthGain:1,headRange:15,expression:'auto',manual:false,headX:0,headY:0,headZ:0,eyeX:0,eyeY:0};
  this.behavior=new AvatarBehaviorController(++instance*7817);
  container.innerHTML='<img class="puppet-reference" alt="'+puppetPacks[kind].name+'" src="/puppets/'+puppetPacks[kind].id+'/reference.png?v='+version+'"><canvas class="puppet-canvas" width="1536" height="1024" hidden aria-label="'+puppetPacks[kind].name+' animado por capas"></canvas>';
  this.fallback=container.querySelector('img');this.canvas=container.querySelector('canvas');
  this.observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{this.onScreen=entries[0]?.isIntersecting!==false;}):null;this.observer?.observe(container);
  loadPack(kind).then(({manifest,images})=>{
   if(this.disposed)return;
   this.rig=new PuppetRig(manifest);this.renderer=new PuppetRenderer(this.canvas,this.rig,images);
   this.status='ready';this.fallback.hidden=true;this.canvas.hidden=false;players.add(this);schedule();
  }).catch(error=>{if(!this.disposed){this.status='error';this.error=String(error?.message||error);console.error('VtuberFriends Puppet:',this.error);this.container.dataset.puppetError=this.error;this.fallback.hidden=false;this.canvas.hidden=true;this.onError?.(this.error);}});
 }
 update(rms,slot,active,frameId){
  if(frameId===undefined||frameId!==this.audioFrame){this.audioFrame=frameId;this.audioAt=performance.now();}
  this.slot=slot;this.settings={accessoryAura:slot.accessoryAura,accessoryFloor:slot.accessoryFloor,accessoryLightning:slot.accessoryLightning,accessoryEffect:slot.accessoryEffect,jadeShiny:this.kind==='jade-puppet'&&!!slot.puppetJadeShiny,cyberGlow:this.kind==='thoxer-puppet'&&(slot.puppetCyberGlow??true)?slot.puppetCyberGlowIntensity??.35:0,idle:slot.puppetIdle??.55,accessoryObjectLeft:slot.accessoryObjectLeft??'none',objectLeftAnimation:slot.objectLeftAnimation??'float',objectLeftAmplitude:slot.objectLeftAmplitude??.4,objectLeftSpeed:slot.objectLeftSpeed??1,accessoryEdits:slot.accessoryEdits||{},accessoryObject:slot.accessoryObject??'none',objectAnimation:slot.objectAnimation??'float',objectAmplitude:slot.objectAmplitude??.4,objectSpeed:slot.objectSpeed??1,accessoryGlasses:slot.accessoryGlasses??'none',accessoryHat:slot.accessoryHat??'none',accessoryNecklace:slot.accessoryNecklace??'none',parts:slot.puppetParts||{},mouthTravel:slot.puppetMouthTravel??70,padding:slot.puppetPadding??280,eyeGlow:slot.puppetEyeGlow?slot.puppetEyeGlowIntensity??.35:0,patternGlow:slot.puppetPatternGlow?slot.puppetPatternGlowIntensity??.25:0};
  this.active=!!active;const i=this.input;
  i.rms=active&&Number.isFinite(rms)?Math.max(0,rms):0;i.thresholdDb=slot.thresholdDb??-60;
  i.mouthMode=slot.puppetMouthMode??'adaptive';i.mouthMaxDb=slot.puppetMouthMaxDb??-25;i.mouthStability=slot.puppetMouthStability??.5;
  i.idle=slot.puppetIdle??.55;i.wings=slot.puppetWings??.5;i.mouthGain=slot.puppetMouthGain??1;
  i.headRange=slot.puppetHeadRange??15;i.expression=slot.puppetExpression||'auto';i.manual=slot.puppetManual??false;
  i.headX=slot.puppetHeadX??0;i.headY=slot.puppetHeadY??0;i.headZ=slot.puppetHeadZ??0;i.eyeX=slot.puppetEyeX??0;i.eyeY=slot.puppetEyeY??0;
 }
 setResolution(cssWidth){
  const size=rasterSize(300,200,cssWidth,globalThis.devicePixelRatio||1,'high');
  if(this.canvas.width!==size.width||this.canvas.height!==size.height){this.canvas.width=size.width;this.canvas.height=size.height;}
 }
 anchor(name){return this.rig?projectAnchor(this.rig,name):null;}
 setMaterialization(progress,color,active=true){this.materializing=active;this.materialization={progress,color};}
 frame(dt){
  if(this.renderer.lost){this.status='context-lost';this.fallback.hidden=false;this.canvas.hidden=true;return;}
  if(this.status==='context-lost'){this.status='ready';this.fallback.hidden=true;this.canvas.hidden=false;}
  if(performance.now()-(this.audioAt||0)>110)this.input.rms=0;
  if(this.editPreview){
   this.input.idle=0;this.input.wings=0;this.input.manual=true;this.input.headX=this.input.headY=this.input.headZ=0;this.input.expression='neutral';
   this.behavior.setOverride('MouthOpen',this.editMouth??0);
  }else this.behavior.clearOverride('MouthOpen');
  let parameters;
  if(this.restPreview){parameters=new Float32Array(ParameterNames.length);parameters[P.EyeOpenLeft]=parameters[P.EyeOpenRight]=parameters[P.MouthWidth]=1;}
  else parameters=this.behavior.update(dt,this.input);
  this.clock=(this.clock||0)+(this.restPreview&&!this.previewObjectMotion&&!this.previewEffects?0:dt);this.settings.objectTime=this.restPreview&&!this.previewObjectMotion?0:this.clock;this.settings.effectPreview=!!this.previewEffects;this.settings.time=this.restPreview&&!this.previewObjectMotion&&!this.previewEffects?0:this.clock;
  this.rig.update(parameters,this.settings);this.renderer.draw(this.materialization);this.onFrame?.();this.frameCount++;
 }
 dispose(){
  if(this.disposed)return;this.disposed=true;players.delete(this);if(!players.size&&raf){cancelAnimationFrame(raf);raf=0;lastFrame=0;}this.observer?.disconnect();this.renderer?.dispose();this.container.replaceChildren();
 }
}
