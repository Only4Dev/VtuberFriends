import {dismissible} from '../dialogs.js?v=__UI_VERSION__';
import {applyAccessoryDraft} from './accessory-profiles.js?v=__UI_VERSION__';
import {puppetPacks} from './packs.js?v=__UI_VERSION__';
import {PuppetAvatar} from './player.js?v=__UI_VERSION__';
import {meshPoint} from './framing.js?v=__UI_VERSION__';
export function dragAccessoryDelta(matrix,dx,dy){const determinant=matrix[0]*matrix[4]-matrix[1]*matrix[3];if(Math.abs(determinant)<.0001)return [0,0];return [(matrix[4]*dx-matrix[3]*dy)/determinant,(-matrix[1]*dx+matrix[0]*dy)/determinant];}
export function activeAccessories(items,draft){return items.filter(a=>draft[a.category]===a.value);}
export function openAccessoryEditor(card,items,save,Player=PuppetAvatar){
 const dialog=dismissible(document.createElement('dialog'));dialog.className='accessory-dialog';
 const content=document.createElement('div');content.innerHTML='<h2>Configurar accesorios</h2><p>Agrega un accesorio y haz clic sobre él. Arrastra para mover, usa las esquinas para tamaño y el tirador verde para girar. Solo Aplicar modifica la fuente.</p><div class="accessory-workspace"><div class="accessory-preview"><div class="accessory-puppet"></div><svg class="accessory-selection" viewBox="0 0 1 1" preserveAspectRatio="none"><polygon fill="#e4c37b18" stroke="#e4c37b" stroke-width=".003" hidden/></svg></div><aside class="accessory-sidebar"><button type="button" class="sound-button add-accessory">+ Agregar accesorio</button><div class="accessory-gallery" hidden></div><div class="accessory-object-list"></div><p class="accessory-empty">No hay un accesorio seleccionado. Pulsa + Agregar accesorio para empezar.</p><div class="accessory-settings" hidden></div></aside></div><p class="accessory-status sound-hint" role="status"></p><div class="sound-actions"><button type="button" data-action="reset" class="sound-button" hidden>Restablecer accesorio</button><button type="button" data-action="remove" class="danger-button" hidden>Quitar accesorio</button><button type="button" data-action="cancel" class="sound-button">Cancelar</button><button type="button" data-action="apply" class="copy-button">Aplicar</button></div>';
 dialog.append(content);document.body.append(dialog);dialog.showModal();
 const avatar=card.slot.avatar,draft=structuredClone(card.slot),body=dialog.querySelector('.accessory-puppet'),overlay=dialog.querySelector('svg'),polygon=dialog.querySelector('polygon'),fields=dialog.querySelector('.accessory-settings'),status=dialog.querySelector('.accessory-status'),gallery=dialog.querySelector('.accessory-gallery'),list=dialog.querySelector('.accessory-object-list'),empty=dialog.querySelector('.accessory-empty');
 const player=new Player(body,avatar);player.restPreview=true;player.previewEffects=true;player.onError=error=>{status.textContent='No se pudo cargar la vista previa: '+error;};
 let selected=null,drag=null,ready=false;const inputs={};
 dialog.querySelector('h2').textContent='Configurar accesorios · '+puppetPacks[avatar].name;
 const key=()=>player.rig.manifest.id+':'+selected.id;
 const part=()=>selected?player.rig?.parts.find(p=>p.definition.accessory?.id===selected.id):null;
 const edit=()=>{draft.accessoryEdits??={};return draft.accessoryEdits[key()]??=structuredClone(part()?.definition.accessory.defaultEdit||{x:0,y:0,scale:1,rotation:0});};
 const title=document.createElement('h3');fields.append(title);const precision=document.createElement('details');precision.innerHTML='<summary>Posición precisa (opcional)</summary>';fields.append(precision);
 const objectPanel=document.createElement('section');objectPanel.className='object-idle';
 for(const [name,labelText,min,max,step]of [['x','Horizontal',-1536,1536,1],['y','Vertical',-1536,1536,1],['scale','Tamaño (%)',1,100,.1],['rotation','Giro',-180,180,.1],['intensity','Intensidad del efecto',0,1,.01],['speed','Velocidad del efecto',.2,3,.1],['interval','Intervalo del humo (segundos)',8,90,1],['spread','Separación de las fosas nasales',.05,.8,.01]]){
  const label=document.createElement('label');label.textContent=labelText;const input=document.createElement('input');input.type='number';Object.assign(input,{min,max,step});input.setAttribute('aria-label',labelText);label.append(input);(['x','y','rotation'].includes(name)?precision:fields).append(label);inputs[name]=input;
  input.oninput=()=>{if(!selected||!player.rig)return;const value=Number(input.value);if(!Number.isFinite(value)||value<min||value>max)return;edit()[name]=name==='scale'?value/100*3:value;update();};
 }
 const colorLabel=document.createElement('label');colorLabel.textContent='Color del efecto';const color=document.createElement('input');color.type='color';colorLabel.append(color);fields.append(colorLabel);inputs.color=color;color.oninput=()=>{if(selected&&player.rig){edit().color=color.value;update();}};
 const animLabel=document.createElement('label');animLabel.textContent='Movimiento del objeto';const animation=document.createElement('select');for(const [id,text]of [['none','Quieto'],['float','Flotación'],['sway','Flotación y balanceo']]){const option=document.createElement('option');option.value=id;option.textContent=text;animation.append(option);}animLabel.append(animation);objectPanel.append(animLabel);
 function objectPrefix(){return selected?.category==='accessoryObjectLeft'?'objectLeft':'object';}
 animation.onchange=()=>{draft[objectPrefix()+'Animation']=animation.value;update();};
 const objectInputs={};for(const [suffix,text,min,max,step,fallback]of [['Amplitude','Intensidad del movimiento',0,1,.01,.4],['Speed','Velocidad del movimiento',.2,3,.1,1]]){const label=document.createElement('label');label.textContent=text;const input=document.createElement('input');input.type='range';Object.assign(input,{min,max,step});label.append(input);objectPanel.append(label);objectInputs[suffix]=[input,fallback];input.oninput=()=>{draft[objectPrefix()+suffix]=Number(input.value);update();};}
 const testLabel=document.createElement('label'),test=document.createElement('input');test.type='checkbox';testLabel.append(test,document.createTextNode(' Probar movimiento'));objectPanel.append(testLabel);test.onchange=()=>{player.previewObjectMotion=test.checked;};fields.append(objectPanel);
 const categories={accessoryGlasses:'Lentes',accessoryHat:'Sombreros',accessoryNecklace:'Collares',accessoryObjectLeft:'Objeto izquierdo',accessoryObject:'Objeto derecho',accessoryAura:'Auras',accessoryFloor:'Humo a los pies',accessoryLightning:'Rayos',accessoryEffect:'Humo nasal'};
 function rebuildGallery(){gallery.replaceChildren();for(const [category,text]of Object.entries(categories)){const matches=items.filter(a=>a.category===category);if(!matches.length)continue;const section=document.createElement('section'),heading=document.createElement('h4');heading.textContent=text;section.append(heading);for(const item of matches){const b=document.createElement('button');b.type='button';b.className='sound-button';b.textContent=item.label;b.onclick=()=>{draft[item.category]=item.value;selected=item;gallery.hidden=true;refresh();update();};section.append(b);}gallery.append(section);}}
 rebuildGallery();dialog.querySelector('.add-accessory').onclick=()=>{gallery.hidden=!gallery.hidden;};
 function refresh(){
  const equipped=activeAccessories(items,draft);if(selected&&!equipped.some(a=>a.id===selected.id))selected=null;
  list.replaceChildren();for(const item of equipped){const b=document.createElement('button');b.type='button';b.className='sound-button';b.textContent=item.label;b.setAttribute('aria-pressed',String(selected?.id===item.id));b.onclick=()=>{selected=item;gallery.hidden=true;refresh();};list.append(b);}
  const show=!!selected&&!!player.rig;fields.hidden=!show;empty.hidden=show;dialog.querySelector('[data-action="reset"]').hidden=!show;dialog.querySelector('[data-action="remove"]').hidden=!show;
  if(!show)return;title.textContent=selected.label;const value=edit();const object=['accessoryObject','accessoryObjectLeft'].includes(selected.category);objectPanel.hidden=!object;
  for(const [name,input]of Object.entries(inputs)){input.parentElement.hidden=['intensity','speed','color'].includes(name)?!selected.fx||(selected.fx==='phone'&&name!=='speed'):['interval','spread'].includes(name)?selected.fx!=='nose-smoke':false;const fallback={scale:1,intensity:1,speed:1,interval:22,spread:.32,color:'#72dafa'}[name]??0;input.value=name==='scale'?((value.scale??1)/3*100).toFixed(1):value[name]??fallback;}
  if(object){animation.value=draft[objectPrefix()+'Animation']??'float';for(const [suffix,[input,fallback]]of Object.entries(objectInputs))input.value=draft[objectPrefix()+suffix]??fallback;}
 }
 function update(){player.update(0,draft,true);player.setResolution(body.getBoundingClientRect().width);}
 player.onFrame=()=>{if(player.status!=='ready')return;if(!ready){ready=true;refresh();}const p=part();polygon.toggleAttribute('hidden',!p);polygon.style.display=p?'':'none';if(p)polygon.setAttribute('points',points(p).map(v=>v.join(',')).join(' '));};
 const ns='http://www.w3.org/2000/svg',handles=[];for(let i=0;i<5;i++){const h=document.createElementNS(ns,'circle');h.setAttribute('r',i===4?'.014':'.011');h.classList.add('gizmo-handle');if(i===4)h.classList.add('gizmo-rotate');h.dataset.mode=i===4?'rotate':'scale';overlay.append(h);handles.push(h);}
 function points(part){const box=player.rig.viewBox;return [[0,0],[1,0],[1,1],[0,1]].map(([u,v])=>{const p=meshPoint(part,u,v,player.rig);return [(p[0]-box[0])/box[2],(p[1]-box[1])/box[3]];});}
 const oldFrame=player.onFrame;player.onFrame=()=>{oldFrame();const part=selected?player.rig?.parts.find(p=>p.definition.accessory?.id===selected.id):null;for(const h of handles)h.style.display=part?'':'none';if(part){const q=points(part);for(let i=0;i<4;i++){handles[i].setAttribute('cx',q[i][0]);handles[i].setAttribute('cy',q[i][1]);}handles[4].setAttribute('cx',(q[0][0]+q[1][0])/2);handles[4].setAttribute('cy',(q[0][1]+q[1][1])/2-.045);}};
 function inside(p,q){let yes=false;for(let i=0,j=q.length-1;i<q.length;j=i++)if((q[i][1]>p[1])!==(q[j][1]>p[1])&&p[0]<(q[j][0]-q[i][0])*(p[1]-q[i][1])/(q[j][1]-q[i][1])+q[i][0])yes=!yes;return yes;}
 overlay.addEventListener('pointerdown',event=>{if(!player.rig)return;const bounds=overlay.getBoundingClientRect(),p=[(event.clientX-bounds.left)/bounds.width,(event.clientY-bounds.top)/bounds.height],mode=event.target.dataset.mode||'move';
  if(mode==='move'){const hit=[...player.rig.parts].reverse().find(part=>part.alpha>0&&activeAccessories(items,draft).some(a=>a.id===part.definition.accessory?.id)&&inside(p,points(part)));if(!hit){selected=null;refresh();return;}selected=items.find(a=>a.id===hit.definition.accessory.id);refresh();}
  const part=player.rig.parts.find(p=>p.definition.accessory?.id===selected?.id);if(!part)return;event.preventDefault();player.rig.lockViewBox=true;const q=points(part),cx=(q[0][0]+q[2][0])/2*bounds.width+bounds.left,cy=(q[0][1]+q[2][1])/2*bounds.height+bounds.top;
  drag={mode,cx,cy,x:event.clientX,y:event.clientY,edit:{...edit()},box:[...player.rig.viewBox],base:[...part.accessoryBase]};overlay.setPointerCapture(event.pointerId);
 });
 overlay.addEventListener('pointermove',event=>{if(!drag)return;const bounds=overlay.getBoundingClientRect();
  if(drag.mode==='move'){const [dx,dy]=dragAccessoryDelta(drag.base,(event.clientX-drag.x)/bounds.width*drag.box[2],(event.clientY-drag.y)/bounds.height*drag.box[3]);Object.assign(edit(),{x:Math.max(-1536,Math.min(1536,drag.edit.x+dx)),y:Math.max(-1536,Math.min(1536,drag.edit.y+dy))});}
  else if(drag.mode==='scale'){const before=Math.hypot(drag.x-drag.cx,drag.y-drag.cy),after=Math.hypot(event.clientX-drag.cx,event.clientY-drag.cy);edit().scale=Math.max(.03,Math.min(3,(drag.edit.scale??1)*after/Math.max(1,before)));}
  else{const delta=(Math.atan2(event.clientY-drag.cy,event.clientX-drag.cx)-Math.atan2(drag.y-drag.cy,drag.x-drag.cx))*180/Math.PI;edit().rotation=((drag.edit.rotation+delta+540)%360)-180;}
  refresh();update();
 });
 for(const event of ['pointerup','pointercancel','lostpointercapture'])overlay.addEventListener(event,()=>{drag=null;if(player.rig)player.rig.lockViewBox=false;});
 dialog.querySelector('[data-action="reset"]').onclick=()=>{if(selected&&player.rig){delete draft.accessoryEdits?.[key()];refresh();update();}};
 dialog.querySelector('[data-action="remove"]').onclick=()=>{if(selected){draft[selected.category]='none';selected=null;refresh();update();}};
 dialog.querySelector('[data-action="cancel"]').onclick=()=>dialog.close();
 dialog.querySelector('[data-action="apply"]').onclick=()=>{if(!player.rig){status.textContent='Espera a que cargue el Puppet.';return;}applyAccessoryDraft(card.slot,draft,avatar);save(card);dialog.close();};
 const resize=new ResizeObserver(update);resize.observe(body);dialog.addEventListener('close',()=>{resize.disconnect();player.dispose();dialog.remove();},{once:true});refresh();update();
}
