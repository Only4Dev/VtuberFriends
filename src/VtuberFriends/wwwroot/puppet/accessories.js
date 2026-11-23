import {isPuppet} from './packs.js?v=__UI_VERSION__';
import {openAccessoryEditor} from './accessory-editor.js?v=__UI_VERSION__';
export const accessoryTitles={accessoryGlasses:'Lentes',accessoryHat:'Sombrero',accessoryNecklace:'Collar',accessoryObjectLeft:'Objeto izquierdo',accessoryObject:'Objeto derecho',accessoryAura:'Aura de color',accessoryFloor:'Humo a los pies',accessoryLightning:'Rayos',accessoryEffect:'Humo nasal'};
let catalogPromise;
export function loadAccessoryCatalog(){
 return catalogPromise??=fetch('/accessories/catalog.json?v=__UI_VERSION__').then(r=>{if(!r.ok)throw Error('No se pudo cargar el catálogo de accesorios.');return r.json();}).then(validateAccessories).catch(e=>{catalogPromise=null;throw e;});
}
export function validateAccessories(items){
 if(!Array.isArray(items)||items.length>32)throw Error('Catálogo de accesorios inválido.');const ids=new Set(),selections=new Set();
 for(const a of items){const selection=a.category+':'+a.value;if(!/^[-a-z0-9]{1,48}$/.test(a.id)||ids.has(a.id)||selections.has(selection)||!Object.hasOwn(accessoryTitles,a.category)||!/^[-a-z0-9]{1,32}$/.test(a.value)||a.value==='none'||!/^[-a-z0-9]+\.(svg|png)$/.test(a.file)||!['head','torso','root'].includes(a.node)||!Array.isArray(a.rect)||a.rect.length!==4||!a.rect.every(Number.isFinite)||a.rect[2]<=0||a.rect[3]<=0||typeof a.label!=='string'||a.fx!==undefined&&!['phone','galaxy','nose-smoke','aura','floor-smoke','lightning','aura-runes','aura-aurora','aura-embers'].includes(a.fx))throw Error('Accesorio inválido.');ids.add(a.id);selections.add(selection);}
 return items;
}
export function expandAccessoryItems(items){return items.flatMap(a=>a.category==='accessoryObject'?[{...a,label:a.label+' · derecha'},{...a,id:a.id+'-left',category:'accessoryObjectLeft',label:a.label+' · izquierda',rect:[1536-a.rect[0]-a.rect[2],...a.rect.slice(1)]}]:[a]);}
export function addAccessories(manifest,items){
 items=expandAccessoryItems(items);
 const parts=items.map(a=>({id:'accessory-'+a.id,node:a.node,src:'accessory-'+a.id+'.png',rect:effectRect(manifest,a),uv:[0,0,1,1],deform:a.node==='head'?'face':'accessory',editReference:a.node,accessory:{key:a.category,value:a.value,id:a.id,fx:a.fx,defaultEdit:defaultAccessoryEdit(manifest,a)}}));
 manifest.parts.unshift(...parts.filter(p=>['aura','floor-smoke','lightning','aura-runes','aura-aurora','aura-embers'].includes(p.accessory.fx)));
 const index=manifest.parts.findIndex(p=>p.id==='head');manifest.parts.splice(index,0,...parts.filter(p=>p.node==='torso'));manifest.parts.push(...parts.filter(p=>p.node!=='torso'&&!['aura','floor-smoke','lightning','aura-runes','aura-aurora','aura-embers'].includes(p.accessory.fx)));
 return new Map(parts.map(p=>[p.src,'/accessories/'+items.find(a=>a.id===p.accessory.id).file+'?v=__UI_VERSION__']));
}
export function accessoryEditKey(rigId,id){return rigId+':'+id;}
export function accessoryControls(card,save,effects=false){
 const root=document.createElement('details');root.className='advanced';root.innerHTML='<summary>'+(effects?'Auras, humo y rayos':'Accesorios')+'</summary>';
 const button=document.createElement('button');button.type='button';button.className='sound-button';button.textContent=effects?'Configurar efectos':'Configurar accesorios';const hint=document.createElement('p');hint.className='sound-hint';hint.textContent='Agrega y selecciona objetos en el editor visual. Los cambios se aplican solo al pulsar Aplicar.';root.append(button,hint);
 button.addEventListener('click',async()=>{button.disabled=true;try{const items=expandAccessoryItems(await loadAccessoryCatalog()).filter(a=>effects===['accessoryAura','accessoryFloor','accessoryLightning','accessoryEffect'].includes(a.category));openAccessoryEditor(card,items,save);}catch(e){hint.textContent=e.message;}finally{refresh();}});
 function refresh(){root.hidden=!isPuppet(card.slot.avatar);button.disabled=!isPuppet(card.slot.avatar);}
 card.refresh.push(refresh);refresh();return root;
}

export function effectRect(m,a){const [w,h]=m.canvas;if(a.fx?.startsWith('aura'))return [.12*w,-70,.76*w,h+160];if(a.fx==='floor-smoke')return [.12*w,h-130,.76*w,230];if(a.fx==='lightning')return [.08*w,-40,.84*w,h+100];if(a.fx==='nose-smoke'){const y=m.anchors?.mouth?.position?.[1]??h*.5;return [(m.anchors?.mouth?.position?.[0]??w*.5)-180,y-320,360,270];}return a.rect;}

export function defaultAccessoryEdit(m,a){
 const [x,y,w,h]=a.rect,parts=m.parts,eyes=parts.filter(p=>/^eye-bg-(left|right)$/.test(p.id));let cx=x+w/2,cy=y+h/2,width=w;
 if(a.category==='accessoryGlasses'&&eyes.length===2){const left=Math.min(...eyes.map(p=>p.rect[0])),right=Math.max(...eyes.map(p=>p.rect[0]+p.rect[2]));cx=(left+right)/2;cy=eyes.reduce((v,p)=>v+p.rect[1]+p.rect[3]/2,0)/2;width=(right-left)*1.2;}
 const head=parts.find(p=>p.id==='head')?.rect,torso=parts.find(p=>p.id==='torso')?.rect;
 if(a.category==='accessoryHat'&&head){cx=head[0]+head[2]/2;cy=head[1]+head[3]*.12;width=head[2]*.44;}
 if(a.category==='accessoryNecklace'&&torso){cx=torso[0]+torso[2]/2;cy=torso[1]+torso[3]*.31;width=torso[2]*.66;}
 if(['accessoryObject','accessoryObjectLeft'].includes(a.category)&&torso){cx=torso[0]+torso[2]*(a.category==='accessoryObjectLeft'?-.22:1.22);cy=torso[1]+torso[3]*.52;width=torso[2]*.42;}
 return {x:cx-x-w/2,y:cy-y-h/2,scale:Math.max(.2,Math.min(3,width/w)),rotation:0};
}
