export function mouthSettings(card,save,render){
 const box=document.createElement('fieldset');box.className='puppet-edit-fields';
 const title=document.createElement('label');title.className='field-label';title.textContent='Apertura según la voz';box.append(title);
 const mode=document.createElement('select');mode.setAttribute('aria-label','Modo de apertura de boca');
 for(const [value,text]of [['adaptive','Automático · sigue la dinámica'],['fixed','Rango fijo · mínimo y máximo dB']]){const option=document.createElement('option');option.value=value;option.textContent=text;mode.append(option);}box.append(mode);
 const refreshers=[];
 function normalize(){if((card.slot.puppetMouthMaxDb??-25)<card.slot.thresholdDb+3)card.slot.puppetMouthMaxDb=card.slot.thresholdDb+3;}
 function range(key,label,min,max,step,fallback,format){
  const wrapper=document.createElement('label');wrapper.className='puppet-edit-range';const caption=document.createElement('span');caption.className='range-label';const name=document.createElement('span');name.textContent=label;const output=document.createElement('output');caption.append(name,output);
  const input=document.createElement('input');input.type='range';Object.assign(input,{min,max,step});input.setAttribute('aria-label',label+' · Fuente '+card.slot.id);
  const refresh=()=>{const value=card.slot[key]??fallback;input.value=value;output.textContent=format(value);input.disabled=key==='puppetMouthMaxDb'&&(card.slot.puppetMouthMode??'adaptive')!=='fixed';};
  input.addEventListener('input',()=>{card.slot[key]=Number(input.value);normalize();save(card);update();render();});wrapper.append(caption,input);box.append(wrapper);refreshers.push(refresh);
 }
 range('thresholdDb','Mínimo · boca cerrada',-80,-20,1,-60,v=>v+' dB');
 range('puppetMouthMaxDb','Máximo · boca abierta al 100%',-65,0,1,-25,v=>v+' dB');
 range('puppetMouthStability','Estabilidad de vocales',0,1,.01,.5,v=>Math.round(v*100)+'%');
 const hint=document.createElement('p');hint.className='sound-hint';box.append(hint);
 function update(){box.disabled=card.slot.puppetMouthMode===undefined;mode.value=card.slot.puppetMouthMode??'adaptive';for(const refresh of refreshers)refresh();hint.textContent=box.disabled?'Reinicia el receptor para activar estos ajustes.':mode.value==='fixed'?'Bajo el mínimo: cerrada. Desde el máximo: abierta por completo. Entre ambos: apertura gradual. La ganancia también afecta la apertura.':'El máximo se adapta a la voz. Más estabilidad reduce vibraciones pequeñas; las pausas siguen cerrando la boca.';}
 mode.addEventListener('change',()=>{card.slot.puppetMouthMode=mode.value;normalize();save(card);update();render();});card.refresh.push(update);update();return box;
}
