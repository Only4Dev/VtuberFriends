import {mountUpdates} from './updates.js?v=__UI_VERSION__';
import {organizeCard} from './studio-layout.js?v=__UI_VERSION__';
import {audioHealthText} from './audio-health.js?v=__UI_VERSION__';
import {mountSettings} from './settings.js?v=__UI_VERSION__';
import {subscribeState} from './state-stream.js?v=__UI_VERSION__';
let soundLibrary=[];
async function refreshSoundLibrary(){try{const r=await fetch('/api/sounds');if(r.ok){const next=await r.json();if(JSON.stringify(next)!==JSON.stringify(soundLibrary)){soundLibrary=next;for(const card of cards.values())for(const refresh of card.refresh)refresh();}}}catch{}}
import {jadePaletteControls} from './puppet/jade-palette.js?v=__UI_VERSION__';
import {prepareGuestAssignment,absentGuestName} from './guest-assignment.js?v=__UI_VERSION__';
import {storeAccessoryProfile,switchAccessoryAvatar} from './puppet/accessory-profiles.js?v=__UI_VERSION__';
import {isPuppet} from './puppet/packs.js?v=__UI_VERSION__';
import {accessoryControls} from './puppet/accessories.js?v=__UI_VERSION__';
import {glowControls} from './puppet/glow-controls.js?v=__UI_VERSION__';
import {ambientControls} from './vfx/ambient-controls.js?v=__UI_VERSION__';
import {mouthSettings} from './puppet/mouth-settings.js?v=__UI_VERSION__';
import {createPuppetEditor} from './puppet/editor.js?v=__UI_VERSION__';
import '/live-update.js?v=__UI_VERSION__';

import {animationRegistry,previewTransition,playSound} from '/transitions.js?v=__UI_VERSION__';

import {palettes,mountAvatar,paintAvatar,suspendAvatar} from '/avatar-view.js?v=__UI_VERSION__';

const cards=new Map(), knownNames=new Map();

let latest=null,received=0,toastTimer,lastRender=0;
let performanceMode=false;try{performanceMode=localStorage.getItem('vf.panel.performance')==='1';}catch{}
document.body.classList.toggle('performance-mode',performanceMode);
const performanceToggle=document.querySelector('#performanceMode');performanceToggle.checked=performanceMode;
const testToggle=document.querySelector('#testMode');let testModeSaving=false;
testToggle.addEventListener('change',async()=>{
 const enabled=testToggle.checked;testModeSaving=true;testToggle.disabled=true;
 try{const response=await fetch('/api/test-mode',{method:'PUT',headers:{'Content-Type':'application/json','X-VF-Panel':'1'},body:JSON.stringify({enabled})});if(!response.ok)throw Error();const result=await response.json();if(latest)latest.testMode=result.enabled;toast(result.enabled?'Modo prueba activo en las fuentes de Streamlabs.':'Modo prueba apagado: presencia real de Discord.');}
 catch{testToggle.checked=latest?.testMode===true;toast('No se pudo cambiar el modo prueba. Comprueba la conexiÃƒÂ³n o instala el parche.');}
 finally{testModeSaving=false;render(true);}
});
performanceToggle.addEventListener('change',()=>{performanceMode=performanceToggle.checked;try{localStorage.setItem('vf.panel.performance',performanceMode?'1':'0');}catch{}document.body.classList.toggle('performance-mode',performanceMode);for(const card of cards.values()){if(performanceMode)suspendAvatar(card.view);refreshControls(card);}render(true);});

function toast(message){const node=document.querySelector('#toast');node.textContent=message;node.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.classList.remove('show'),4000);}

function describeSave(card,text,error=false){card.save.textContent=text;card.save.classList.toggle('error',error);}

function scheduleSave(card){
 storeAccessoryProfile(card.slot);
 if(card.slot.puppetMouthMode==='fixed'&&card.slot.puppetMouthMaxDb<card.slot.thresholdDb+3)card.slot.puppetMouthMaxDb=card.slot.thresholdDb+3;

 clearTimeout(card.timer);card.dirty=true;card.revision++;describeSave(card,'GuardandoÃ¢â‚¬Â¦');

 card.copy.disabled=true;card.timer=setTimeout(()=>flush(card),180);

}

async function flush(card){

 if(card.saving)return;

 card.saving=true;const revision=card.revision,body=JSON.stringify(card.slot);

 try{

  const response=await fetch('/api/slots/'+card.slot.id,{method:'PUT',headers:{'Content-Type':'application/json','X-VF-Panel':'1'},body});

  const result=await response.json();

  if(!response.ok)throw Error(result.error||result.detail||'No se pudieron guardar los ajustes.');

  if(revision===card.revision){card.slot=result;card.dirty=false;describeSave(card,'Guardado');}

 }catch(error){describeSave(card,'Sin guardar',true);toast(error.message);}

 finally{card.saving=false;card.copy.disabled=!card.slot.userId||card.dirty;if(revision!==card.revision)flush(card);}

}

function control(card,key,min,max,step,format){

 const wrapper=document.createElement('div');

 const label=document.createElement('label');label.className='range-label';

 const span=document.createElement('span');

 span.textContent=({transitionScale:'Escala del efecto',transitionDensity:'Densidad de partÃƒÂ­culas',transitionSpeed:'Velocidad de la secuencia',transitionIntensity:'Intensidad de efectos',opacity:'Opacidad',thresholdDb:'Umbral de voz',holdMs:'Cierre de boca',scale:'TamaÃƒÂ±o',nameSize:'TamaÃƒÂ±o del nombre',nameOpacity:'Opacidad del nombre',soundVolume:'Volumen de efectos',puppetIdle:'Vida en reposo',puppetWings:'Movimiento de alas',puppetMouthGain:'Respuesta de boca',puppetHeadRange:'LÃƒÂ­mite de giro',puppetHeadX:'Cabeza Ã‚Â· horizontal',puppetHeadY:'Cabeza Ã‚Â· vertical',puppetHeadZ:'InclinaciÃƒÂ³n',puppetEyeX:'Mirada Ã‚Â· horizontal',puppetEyeY:'Mirada Ã‚Â· vertical'})[key];

 const output=document.createElement('output');const input=document.createElement('input');input.type='range';input.min=min;input.max=max;input.step=step;

 input.setAttribute('aria-label',span.textContent+' Ã‚Â· Fuente '+card.slot.id);

 const refresh=()=>{const value=card.slot[key]??({transitionSpeed:1,transitionIntensity:.8,transitionScale:1,transitionDensity:.75}[key]);input.value=value;output.textContent=format(value);};

 label.append(span,output);wrapper.append(label,input);

 input.addEventListener('input',()=>{card.slot[key]=Number(input.value);output.textContent=format(card.slot[key]);scheduleSave(card);render();});

 card.refresh.push(refresh);refresh();return wrapper;

}

function createCard(slot){

 const node=document.createElement('article');node.className='card';

 node.innerHTML='<div class="card-top"><span class="slot-number"></span><label class="show-toggle">Mostrar <input type="checkbox" aria-label="Mostrar en stream"></label></div>'+

 '<div class="preview"><span class="live-status"></span><div class="empty-preview"><span>Ã¢â€”â€¡</span>Asigna una voz a esta fuente</div><div class="avatar-render"></div></div>'+

 '<div class="card-controls"><div class="selectors"><div><label class="field-label">Invitado</label><select class="user-select" aria-label="Invitado"></select></div><div><label class="field-label">Avatar</label><select class="avatar-select" aria-label="Avatar"></select></div></div>'+

 '<div class="opacity-control"></div><div class="range-hints"><span>Transparente</span><span>Visible</span></div>'+

 '<details class="advanced"><summary>Sensibilidad y apariencia</summary><div class="advanced-content"></div></details>'+

 '<div class="volume-row"><span>VOZ</span><meter min="-100" max="0" value="-100"></meter><span class="volume-db">Ã¢Ë†â€™Ã¢Ë†Å¾ dB</span></div></div>'+

 '<div class="card-footer"><button class="copy-button">Ã¢â€ â€” &nbsp; Copiar fuente</button><span class="save-state">Guardado</span></div>';

 const card={node,slot:{...slot},refresh:[],dirty:false,saving:false,revision:0};

 card.view=mountAvatar(node.querySelector('.avatar-render'));

 card.user=node.querySelector('.user-select');card.avatar=node.querySelector('.avatar-select');

 card.enabled=node.querySelector('.show-toggle input');card.copy=node.querySelector('.copy-button');card.save=node.querySelector('.save-state');

 node.querySelector('.slot-number').textContent='FUENTE '+String(slot.id).padStart(2,'0');

 card.user.setAttribute('aria-label','Invitado de la fuente '+slot.id);

 card.avatar.setAttribute('aria-label','Avatar de la fuente '+slot.id);

 card.enabled.setAttribute('aria-label','Mostrar fuente '+slot.id+' en stream');

 const modern=document.createElement('optgroup'),legacy=document.createElement('optgroup');modern.label='Puppets 2D';legacy.label='Legacy Â· primeros avatares';card.avatar.append(modern,legacy);for(const [value,palette]of Object.entries(palettes)){const option=document.createElement('option');option.value=value;option.textContent=palette.name;(isPuppet(value)?modern:legacy).append(option);}

 card.user.addEventListener('change',()=>{

  card.slot.userId=card.user.value||null;

  if(!card.slot.userId)card.slot.enabled=false;

  // Preserve the user's existing sensitivity preference on first assignment.

  try{const previous=localStorage.getItem('vf.threshold.'+card.slot.userId);if(previous!==null){const value=Number(previous);if(Number.isFinite(value)&&value>=-80&&value<=-20)card.slot.thresholdDb=value;}}catch{}

  scheduleSave(card);refreshControls(card);render();

 });

 const preassign=document.createElement('details');preassign.className='advanced preassign-guest';
 preassign.innerHTML='<summary>Asignar antes de entrar</summary><div class="advanced-content"><label class="field-label">ID de usuario de Discord<input class="guest-id-input" type="text" inputmode="numeric" pattern="[0-9]{17,20}" maxlength="20" placeholder="Pega aquÃƒÂ­ su ID de usuario" autocomplete="off"></label><button class="sound-button" type="button">Preparar invitado</button><p class="sound-hint">Activa el modo desarrollador de Discord y usa Ã‚Â«Copiar ID de usuarioÃ‚Â» en su perfil. Al preparar se activa Mostrar; la fuente permanece oculta hasta que entre a este canal. La asignaciÃƒÂ³n se conserva en prÃƒÂ³ximos inicios.</p><p class="guest-assignment-error" role="alert" hidden></p></div>';
 const idInput=preassign.querySelector('input'),idError=preassign.querySelector('[role=alert]');
 const prepare=()=>{
  try{card.slot=prepareGuestAssignment(card.slot,idInput.value,[...cards.values()].map(c=>c.slot));idError.hidden=true;idInput.setCustomValidity('');scheduleSave(card);refreshControls(card);render(true);}
  catch(error){idError.textContent=error.message;idError.hidden=false;idInput.setCustomValidity(error.message);idInput.reportValidity();}
 };
 idInput.setAttribute('aria-label','ID de Discord Ã‚Â· Fuente '+slot.id);
 idInput.addEventListener('input',()=>{idInput.setCustomValidity('');idError.hidden=true;});
 idInput.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();prepare();}});
 preassign.querySelector('button').addEventListener('click',prepare);
 node.querySelector('.selectors').after(preassign);

 card.avatar.addEventListener('change',()=>{switchAccessoryAvatar(card.slot,card.avatar.value);scheduleSave(card);refreshControls(card);render();});

 card.enabled.addEventListener('change',()=>{card.slot.enabled=card.enabled.checked;scheduleSave(card);render();});

 node.querySelector('.opacity-control').append(control(card,'opacity',0,1,.01,value=>Math.round(value*100)+'%'));

 const advanced=node.querySelector('.advanced:not(.preassign-guest) .advanced-content');

 advanced.append(control(card,'thresholdDb',-80,-20,1,value=>value+' dB'),control(card,'holdMs',0,750,25,value=>value+' ms'),control(card,'scale',.5,1.4,.05,value=>Math.round(value*100)+'%'));

 const appearance=document.createElement('details');appearance.className='advanced';

 appearance.innerHTML='<summary>Etiqueta de nombre</summary><div class="advanced-content"></div>';

 node.querySelector('.card-controls').insertBefore(appearance,node.querySelector('.advanced'));

 const nameControls=appearance.querySelector('.advanced-content');

 const styleLabel=document.createElement('label');styleLabel.className='field-label';styleLabel.textContent='Estilo';

 card.nameStyle=document.createElement('select');card.nameStyle.setAttribute('aria-label','Estilo de nombre Ã‚Â· Fuente '+slot.id);

 for(const [value,title] of [['plate','Placa con marco'],['outline','Letras con borde negro']]){

  const option=document.createElement('option');option.value=value;option.textContent=title;card.nameStyle.append(option);

 }

 card.nameStyle.addEventListener('change',()=>{card.slot.nameStyle=card.nameStyle.value;scheduleSave(card);render();});

 nameControls.append(styleLabel,card.nameStyle,control(card,'nameSize',8,36,1,value=>value+' px'),control(card,'nameOpacity',0,1,.01,value=>Math.round(value*100)+'%'));

 const motion=document.createElement('details');motion.className='advanced';

 motion.innerHTML='<summary>Entrada, salida y sonidos</summary><div class="advanced-content"></div>';

 node.querySelector('.card-controls').append(motion);

 const motionControls=motion.querySelector('.advanced-content');

 card.motionSelects=[];

 for(const [direction,title] of [['entry','Entrada'],['exit','Salida']]){

  const block=document.createElement('div');block.className='transition-block';

  const caption=document.createElement('label');caption.className='field-label';caption.textContent=title;

  const select=document.createElement('select');select.setAttribute('aria-label','AnimaciÃƒÂ³n de '+title+' Ã‚Â· Fuente '+slot.id);

  for(const [id,definition]of animationRegistry){const option=document.createElement('option');option.value=id;option.textContent=definition.label;select.append(option);}

  const key=direction+'Animation';

  select.addEventListener('change',()=>{card.slot[key]=select.value;scheduleSave(card);});

  card.motionSelects.push({select,key});

  const soundSelect=document.createElement('select');soundSelect.setAttribute('aria-label','Sonido de '+title+' Ã‚Â· Fuente '+slot.id);

  const soundKey=direction+'Sound',soundNameKey=direction+'SoundName',soundFileKey=direction+'SoundFile';

  function refreshSound(){

   soundSelect.replaceChildren();

   for(const [value,label]of [['none','Sin sonido'],['builtin',direction==='entry'?'Pop suave incluido':'Burbuja suave incluida']]){

    const option=document.createElement('option');option.value=value;option.textContent=label;soundSelect.append(option);

   }

   for(const sound of soundLibrary){const option=document.createElement('option');option.value=sound.soundId;option.textContent=sound.name;soundSelect.append(option);}
   const custom=card.slot[soundFileKey]||(card.slot[soundKey]&&!['none','builtin'].includes(card.slot[soundKey])?card.slot[soundKey]:null);

   if(custom&&!soundLibrary.some(s=>s.soundId===custom)){

    const option=document.createElement('option');option.value=custom;option.textContent=card.slot[soundNameKey]||'Archivo personalizado';soundSelect.append(option);

   }

   soundSelect.value=card.slot[soundKey]||'builtin';

  }

  card.refresh.push(refreshSound);

  soundSelect.addEventListener('change',()=>{card.slot[soundKey]=soundSelect.value;const chosen=soundLibrary.find(s=>s.soundId===soundSelect.value);card.slot[soundFileKey]=chosen?.soundId??null;card.slot[soundNameKey]=chosen?.name??null;scheduleSave(card);});

  const file=document.createElement('input');file.type='file';file.accept='.wav,.mp3,.ogg,.m4a,.webm';file.hidden=true;

  file.setAttribute('aria-label','Archivo de sonido de '+title+' Ã‚Â· Fuente '+slot.id);

  const choose=document.createElement('button');choose.type='button';choose.className='sound-button';choose.textContent='Elegir archivoÃ¢â‚¬Â¦';choose.addEventListener('click',()=>file.click());

  file.addEventListener('change',async()=>{

   const selected=file.files[0];if(!selected)return;

   if(selected.size>10*1024*1024){toast('El sonido debe ser de hasta 10 MB.');return;}

   card.importing=true;choose.disabled=true;choose.textContent='ImportandoÃ¢â‚¬Â¦';

   try{

    const form=new FormData();form.append('sound',selected);

    const response=await fetch('/api/sounds',{method:'POST',headers:{'X-VF-Panel':'1'},body:form});

    const result=await response.json();if(!response.ok)throw Error(result.error||'No se pudo importar el sonido.');

    card.slot[soundKey]=result.soundId;card.slot[soundFileKey]=result.soundId;card.slot[soundNameKey]=result.name;scheduleSave(card);refreshSound();toast('Sonido importado: '+result.name);

   }catch(error){toast(error.message);}

   finally{card.importing=false;choose.disabled=false;choose.textContent='Elegir archivoÃ¢â‚¬Â¦';file.value='';}

  });

  const test=document.createElement('button');test.type='button';test.className='sound-button';test.classList.add('preview-transition');test.disabled=performanceMode;test.textContent='Probar '+title.toLowerCase();

  test.addEventListener('click',async()=>{

   if(!card.slot.userId){toast('Asigna un invitado para ver la transiciÃƒÂ³n.');return;}

   // A user click authorizes preview audio in the panel; no live-source changes.

   await previewTransition(card.view,card.slot,direction);

  });

  const testSound=document.createElement('button');testSound.type='button';testSound.className='sound-button';testSound.textContent='Escuchar';

  testSound.addEventListener('click',async()=>{if(!await playSound(card.view,card.slot,direction))toast('El navegador no pudo reproducir ese archivo de audio.');});

  const buttons=document.createElement('div');buttons.className='sound-actions';buttons.append(choose,testSound,test);

  const libraryHint=document.createElement('p');libraryHint.className='sound-hint';libraryHint.textContent='Copia sonidos a la carpeta Sonidos y pulsa Actualizar biblioteca. WAV, MP3, OGG, M4A o WEBM; mÃƒÂ¡ximo 10 MB.';block.append(caption,select,soundSelect,buttons,file,libraryHint);motionControls.append(block);

 }

 const effectControls=document.createElement('fieldset');effectControls.className='puppet-edit-fields';
 effectControls.append(control(card,'transitionSpeed',.6,1.5,.05,v=>Number(v).toFixed(2)+'Ãƒâ€”'),control(card,'transitionIntensity',.2,1,.05,v=>Math.round(v*100)+'%'));
 effectControls.append(control(card,'transitionScale',.65,1.15,.05,v=>Math.round(v*100)+'%'),control(card,'transitionDensity',.25,1,.05,v=>Math.round(v*100)+'%'));
 const quality=document.createElement('select');quality.setAttribute('aria-label','Calidad de efectos Ã‚Â· Fuente '+slot.id);
 for(const [value,label]of [['low','Calidad ligera'],['medium','Calidad equilibrada'],['high','Calidad alta']]){const option=document.createElement('option');option.value=value;option.textContent=label;quality.append(option);}
 quality.addEventListener('change',()=>{card.slot.transitionQuality=quality.value;scheduleSave(card);});effectControls.append(quality);motionControls.append(effectControls);
 const tintLabel=document.createElement('label');tintLabel.className='check-label';const tintToggle=document.createElement('input');tintToggle.type='checkbox';tintLabel.append(tintToggle,document.createTextNode(' Color de energÃƒÂ­a personalizado'));
 const tint=document.createElement('input');tint.type='color';tint.value='#ffbb77';tint.setAttribute('aria-label','Color de energÃƒÂ­a Ã‚Â· Fuente '+slot.id);effectControls.append(tintLabel,tint);
 tintToggle.addEventListener('change',()=>{card.slot.transitionColor=tintToggle.checked?tint.value:'preset';tint.disabled=!tintToggle.checked;scheduleSave(card);});
 tint.addEventListener('input',()=>{card.slot.transitionColor=tint.value;scheduleSave(card);});
 card.refresh.push(()=>{tintToggle.checked=card.slot.transitionColor!=='preset'&&!!card.slot.transitionColor;tint.disabled=!tintToggle.checked;if(tintToggle.checked)tint.value=card.slot.transitionColor;});
 card.refresh.push(()=>{effectControls.disabled=card.slot.transitionQuality===undefined;quality.value=card.slot.transitionQuality||'medium';});
 motionControls.append(control(card,'soundVolume' ,0,1,.01,value=>Math.round(value*100)+'%'));

 const audioHint=document.createElement('p');audioHint.className='sound-hint';audioHint.textContent='Los sonidos salen desde cada fuente de Streamlabs. Importa archivos de tu PC (hasta 10 MB); el programa conserva una copia local.';motionControls.append(audioHint);

 card.puppetControls=document.createElement('details');card.puppetControls.className='advanced';

 card.puppetControls.innerHTML='<summary>Puppet 2D Ã‚Â· movimiento y expresiÃƒÂ³n</summary><div class="advanced-content"></div>';

 const puppetControls=card.puppetControls.querySelector('.advanced-content');

 card.puppetStatus=document.createElement('p');card.puppetStatus.className='sound-hint';

 puppetControls.append(card.puppetStatus,

  control(card,'puppetIdle',0,1,.01,value=>Math.round(value*100)+'%'),

  control(card,'puppetWings',0,1,.01,value=>Math.round(value*100)+'%'),

  control(card,'puppetMouthGain',.2,3,.05,value=>Number(value).toFixed(2)+'Ãƒâ€”'),

  control(card,'puppetHeadRange',0,20,1,value=>value+'Ã‚Â°'));

 puppetControls.append(jadePaletteControls(card,scheduleSave),mouthSettings(card,scheduleSave,render),glowControls(card,scheduleSave));
 card.expression=document.createElement('select');card.expression.setAttribute('aria-label','ExpresiÃƒÂ³n Puppet Ã‚Â· Fuente '+slot.id);

 for(const [value,title]of [['auto','Gestos espontÃƒÂ¡neos'],['neutral','Neutral'],['curious','Curiosidad'],['surprised','Sorpresa'],['angry','Enfado'],['happy','AlegrÃƒÂ­a'],['yawn','Bostezo']]){

  const option=document.createElement('option');option.value=value;option.textContent=title;card.expression.append(option);

 }

 card.expression.addEventListener('change',()=>{card.slot.puppetExpression=card.expression.value;scheduleSave(card);});

 puppetControls.append(card.expression);

 const manualLabel=document.createElement('label');manualLabel.className='check-label';

 card.manual=document.createElement('input');card.manual.type='checkbox';card.manual.setAttribute('aria-label','Control manual de cabeza y mirada Ã‚Â· Fuente '+slot.id);

 manualLabel.append(card.manual,document.createTextNode(' Control manual de cabeza y mirada'));

 card.manual.addEventListener('change',()=>{card.slot.puppetManual=card.manual.checked;scheduleSave(card);});

 puppetControls.append(manualLabel,

  control(card,'puppetHeadX',-20,20,1,value=>value+'Ã‚Â°'),control(card,'puppetHeadY',-20,20,1,value=>value+'Ã‚Â°'),

  control(card,'puppetHeadZ',-15,15,1,value=>value+'Ã‚Â°'),

  control(card,'puppetEyeX',-1,1,.05,value=>Number(value).toFixed(2)),control(card,'puppetEyeY',-1,1,.05,value=>Number(value).toFixed(2)));

 node.querySelector('.card-controls').append(card.puppetControls);

 card.editor=createPuppetEditor(card,scheduleSave,render);node.querySelector('.card-controls').append(card.editor.root);card.refresh.push(()=>card.editor.refresh());
 node.querySelector('.card-controls').append(ambientControls(card,scheduleSave),accessoryControls(card,scheduleSave,true),accessoryControls(card,scheduleSave));
 const nameLabel=document.createElement('label');nameLabel.className='name-toggle show-toggle';

 card.showName=document.createElement('input');card.showName.type='checkbox';card.showName.setAttribute('aria-label','Mostrar nombre en fuente '+slot.id);

 nameLabel.append(document.createTextNode('Etiqueta de nombre'),card.showName);node.querySelector('.card-controls').insertBefore(nameLabel,node.querySelector('.advanced'));

 card.showName.addEventListener('change',()=>{card.slot.showName=card.showName.checked;appearance.hidden=!card.slot.showName;scheduleSave(card);render();});

 card.copy.addEventListener('click',async()=>{

  const url=new URL('/overlay/'+card.slot.id,location.origin).href;

  try{await navigator.clipboard.writeText(url);toast('Fuente '+slot.id+' copiada Ã‚Â· tamaÃƒÂ±o HD: 1440 Ãƒâ€” 1080');}

  catch{const input=document.createElement('input');input.value=url;input.readOnly=true;card.node.querySelector('.card-footer').append(input);input.focus();input.select();toast('Copia la URL seleccionada.');}

 });

 organizeCard(card,{appearance,motion,nameLabel});
 cards.set(slot.id,card);document.querySelector('#cards').append(node);refreshControls(card);return card;

}

function refreshControls(card){

 for(const [key,value]of Object.entries({nameStyle:'plate',nameSize:17,nameOpacity:1,entryAnimation:'pop',exitAnimation:'pop',entrySound:'builtin',exitSound:'builtin',soundVolume:.45,puppetIdle:.55,puppetWings:.5,puppetMouthGain:1,puppetHeadRange:15,puppetExpression:'auto',puppetManual:false,puppetHeadX:0,puppetHeadY:0,puppetHeadZ:0,puppetEyeX:0,puppetEyeY:0}))

  if(card.slot[key]===undefined||card.slot[key]===null)card.slot[key]=value;

 const selected=card.slot.userId;

 if(document.activeElement!==card.user){

  card.user.replaceChildren();const blank=document.createElement('option');blank.value='';blank.textContent='Sin asignar';card.user.append(blank);

  const people=[...(latest?.participants||[])];

  if(selected&&!people.some(person=>person.userId===selected))people.push({userId:selected,name:knownNames.get(selected)||absentGuestName(selected),present:false});

  for(const person of people){

   const option=document.createElement('option');option.value=person.userId;option.textContent=person.name+(person.present?'':' Ã‚Â· fuera');

   option.disabled=[...cards.values()].some(other=>other.slot.id!==card.slot.id&&other.slot.userId===person.userId);

   card.user.append(option);

  }

  card.user.value=selected||'';

 }

 card.avatar.value=card.slot.avatar;card.enabled.checked=card.slot.enabled;card.enabled.disabled=!selected;

 card.puppetControls.hidden=!isPuppet(card.slot.avatar);card.expression.value=card.slot.puppetExpression||'auto';card.manual.checked=!!card.slot.puppetManual;

 card.nameStyle.value=card.slot.nameStyle||'plate';for(const item of card.motionSelects)item.select.value=card.slot[item.key]||'pop';

 card.showName.checked=card.slot.showName;card.copy.disabled=!selected||card.dirty;

 for(const refresh of card.refresh)refresh();
 for(const button of card.node.querySelectorAll('.preview-transition'))button.disabled=performanceMode;

}

function render(force=false){
 if(document.hidden)return;
 const now=performance.now();if(performanceMode&&!force&&now-lastRender<200)return;lastRender=now;

 if(!latest)return;

 const fresh=performance.now()-received<1200;

 const connected=fresh&&(latest.receiver.status==='connected'||latest.receiver.mode==='demo');
 const testing=fresh&&latest.testMode===true;
 if(!testModeSaving)testToggle.checked=testing;testToggle.disabled=!fresh||testModeSaving;
 document.querySelector('#testModeNotice').hidden=!testing;


 let visible=0;

 for(const card of cards.values()){

  const person=latest.participants.find(p=>p.userId===card.slot.userId);

  const level=latest.users.find(u=>u.userId===card.slot.userId);

  const known=person||{name:knownNames.get(card.slot.userId)||(card.slot.userId?absentGuestName(card.slot.userId):'Fuera del canal'),present:false};

  if(!performanceMode)paintAvatar(card.view,card.slot,known,level,{preview:true,fresh,connected});

  card.editor.update(card.view.puppet);
  card.puppetControls.hidden=!isPuppet(card.slot.avatar);

  if(isPuppet(card.slot.avatar))card.puppetStatus.textContent=performanceMode?'Vista previa pausada en este panel.':card.view.puppet?.status==='ready'

   ? 'Avatar listo Ã‚Â· movimiento y respuesta a la voz activos.'

   : card.view.puppet?.status==='error'?('Puppet detenido: '+(card.view.puppet?.error||'No se pudo iniciar WebGL')+'. Se muestra la referencia estÃƒÂ¡tica.')

   : card.view.puppet?.status==='context-lost'?'Contexto grÃƒÂ¡fico perdido; intentando recuperar el rig.':'Cargando capas y texturasÃ¢â‚¬Â¦';

  card.node.querySelector('.empty-preview').hidden=!!card.slot.userId;

  card.node.querySelector('.live-status').textContent=!card.slot.userId?'SIN ASIGNAR':testing&&card.slot.enabled?'PRUEBA EN STREAMLABS':!connected?'SIN CONEXIÃƒâ€œN':!person?.present?'FUERA DEL CANAL':card.slot.enabled?'LISTO PARA STREAM':'SOLO VISTA PREVIA';

  const db=connected&&person?.present&&level?.rms>0?Math.max(-100,20*Math.log10(level.rms)):-100;

  card.node.querySelector('meter').value=db;

  card.node.querySelector('.volume-db').textContent=db>-100?db.toFixed(0)+' dB':'Ã¢Ë†â€™Ã¢Ë†Å¾ dB';

  if(card.slot.userId&&card.slot.enabled)visible++;

 }

 document.querySelector('nav a[href="#cast"] b').textContent=String(latest.slots.length).padStart(2,'0');
 document.querySelector('#activeCount').innerHTML=visible+' <small>/ '+latest.slots.length+'</small>';

 document.querySelector('#connectionDot').classList.toggle('offline',!connected);

 document.querySelector('#connectionLabel').textContent=latest.receiver.recovery?.state==='blocked'?'DAVE detenido Ã‚Â· reconexiÃƒÂ³n manual':latest.receiver.recovery?.state==='reconnecting'?'Recuperando voz de Discord':latest.receiver.recovery?.state==='paused'?'Audio requiere reconexiÃƒÂ³n manual':!fresh?'Receptor desconectado':latest.receiver.mode==='demo'?'Modo demostraciÃƒÂ³n':connected?'Discord conectado':'Discord desconectado';

}

let lastControls=0,lastDiagnosticPayload=null;
function receiveState(state){
 latest=state;received=performance.now();if(performance.now()-lastControls<(performanceMode?500:200))return;lastControls=performance.now();
  for(const person of latest.participants)knownNames.set(person.userId,person.name);

  for(const slot of latest.slots){

   const card=cards.get(slot.id)||createCard(slot);

   if(!card.dirty&&!card.saving&&card.lastServerSlot!==slot){card.lastServerSlot=slot;card.slot={...slot};refreshControls(card);}

  }

  const guests=document.querySelector('#guestList');guests.replaceChildren();

  for(const person of latest.participants){

   const pill=document.createElement('span');pill.className='guest-pill';

   pill.append(document.createElement('i'),document.createTextNode(person.name));guests.append(pill);

  }

  if(!latest.participants.length){const label=document.createElement('span');label.className='muted';label.textContent='Sin invitados en el canal';guests.append(label);}

  document.querySelector('#guestCount').textContent=latest.participants.length;

  if(lastDiagnosticPayload!==latest.receiver.diagnostics){lastDiagnosticPayload=latest.receiver.diagnostics;
  document.querySelector('#audioHealthSummary').textContent=audioHealthText(latest.receiver);
  const diagnostics=latest.receiver.diagnostics||{};

  const recent=diagnostics.warningsLast60Seconds??0, decrypt=diagnostics.decryptFailuresLast60Seconds??0;

  document.querySelector('#diagnosticSummary').textContent='Avisos de esta conexiÃƒÂ³n: '+(latest.receiver.warnings??0)+' Ã‚Â· ÃƒÅ¡ltimos 60 segundos: '+recent+' Ã‚Â· Fallos nativos de descifrado en 60 s: '+decrypt+'. Paquetes de audio descartados en 60 s: '+(diagnostics.packetErrorsLast60Seconds??0)+'. El total histÃƒÂ³rico no indica por sÃƒÂ­ solo un fallo activo.';

  const warnings=document.querySelector('#warningKinds');warnings.replaceChildren();

  for(const [kind,count]of Object.entries(diagnostics.warningKinds||{})){

   const label=document.createElement('p');label.className='sound-hint';

   const inWindow=diagnostics.warningKindsLast60Seconds?.[kind]??0;
   label.textContent=(kind.startsWith('DAVE_DECRYPT_')?'Audio DAVE rechazado ('+kind.slice(13)+')':kind.startsWith('VOICE_OPCODE_')?'Mensaje de voz no reconocido por la biblioteca ('+kind.slice(13)+')':kind==='DAVE_UNEXPECTED_TRANSITION'?'TransiciÃƒÂ³n DAVE inesperada':kind==='VOICE_CONNECTION_INTERRUPTED'?'ConexiÃƒÂ³n de voz interrumpida':'Otros avisos de Discord')+': '+count+' acumulados Ã‚Â· '+inWindow+' en los ÃƒÂºltimos 60 s';

   warnings.append(label);

  }

  const log=diagnostics.log;
  if(log)document.querySelector('#diagnosticSummary').textContent+=' Registro local: .local/'+log.relativePath+(log.writeFailed?' Ã‚Â· No se pudo escribir el archivo.':' Ã‚Â· Solo categorÃƒÂ­as y cantidades; sin audio ni claves.');
  document.querySelector('#diagnostics').textContent=JSON.stringify(latest.receiver,null,2);
  }

  render();

}

document.querySelector('#helpButton').addEventListener('click',()=>document.querySelector('#help').showModal());

document.querySelector('#closeHelp').addEventListener('click',()=>document.querySelector('#help').close());

setInterval(render,50);subscribeState(receiveState,()=>{received=0;document.querySelector('#connectionLabel').textContent='Receptor desconectado';render();},{panel:true});



document.addEventListener('vf-audio-blocked',()=>toast('No se pudo reproducir el sonido. Comprueba el formato y el audio del navegador.'));

globalThis.vfReloadReady=()=>![...cards.values()].some(card=>card.dirty||card.saving||card.importing);
refreshSoundLibrary();document.addEventListener('vf-refresh-sounds',refreshSoundLibrary);

mountSettings();

mountUpdates();
