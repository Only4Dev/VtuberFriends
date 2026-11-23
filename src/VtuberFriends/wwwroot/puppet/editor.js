import {isPuppet} from './packs.js?v=__UI_VERSION__';
export const editableParts=[['head','Cabeza'],['fangs','Colmillos'],['jaw','Mandíbula y dientes inferiores'],['tongue','Lengua'],['mouth','Interior y fondo de boca'],['torso','Cuerpo'],['wing-left','Ala izquierda'],['wing-right','Ala derecha'],['eye-left','Ojo izquierdo'],['eye-right','Ojo derecho'],['eye-bg-left','Fondo ojo izquierdo'],['eye-bg-right','Fondo ojo derecho'],['lid-left-upper','Párpado superior izquierdo'],['lid-left-lower','Párpado inferior izquierdo'],['lid-right-upper','Párpado superior derecho'],['lid-right-lower','Párpado inferior derecho']];
// Piece transforms remain stored, but the coordinate editor is deferred to a visual tool.
export function createPuppetEditor(card,save){
 const root=document.createElement('details');root.className='advanced puppet-editor';root.innerHTML='<summary>Boca y encuadre</summary>';
 const content=document.createElement('fieldset');content.className='advanced-content puppet-edit-fields';root.append(content);const refreshers=[];
 for(const [key,title,min,max,step,fallback]of [['puppetMouthTravel','Apertura máxima de boca',20,130,1,70],['puppetPadding','Margen del canvas',120,450,5,280]]){
  const wrapper=document.createElement('label');wrapper.className='puppet-edit-range';const caption=document.createElement('span');caption.className='range-label';const label=document.createElement('span');label.textContent=title;const output=document.createElement('output');caption.append(label,output);
  const input=document.createElement('input');input.type='range';Object.assign(input,{min,max,step});input.setAttribute('aria-label',title+' · Fuente '+card.slot.id);wrapper.append(caption,input);content.append(wrapper);
  const refresh=()=>{input.value=card.slot[key]??fallback;output.textContent=(card.slot[key]??fallback)+' px';};refreshers.push(refresh);
  input.addEventListener('input',()=>{card.slot[key]=Number(input.value);refresh();save(card);});
 }
 function refresh(){content.disabled=card.slot.puppetMouthTravel===undefined;for(const update of refreshers)update();}
 refresh();return {root,refresh,update(puppet){root.hidden=!isPuppet(card.slot.avatar);if(puppet)puppet.editPreview=false;}};
}
