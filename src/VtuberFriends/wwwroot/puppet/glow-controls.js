export function glowControls(card,save){
 const root=document.createElement('details');root.className='advanced';root.innerHTML='<summary>Brillo · ojos y patrón del avatar</summary>';const fields=document.createElement('fieldset');fields.className='advanced-content puppet-edit-fields';root.append(fields);const refreshers=[];
 for(const [enabled,amount,title,fallback]of [['puppetEyeGlow','puppetEyeGlowIntensity','Glow de los ojos',.35],['puppetPatternGlow','puppetPatternGlowIntensity','Glow del patrón del avatar',.25],['puppetCyberGlow','puppetCyberGlowIntensity','Brillo cibernético · respiración',.35]]){
  const label=document.createElement('label');label.className='check-label';const check=document.createElement('input');check.type='checkbox';label.append(check,document.createTextNode(' '+title));fields.append(label);
  const row=document.createElement('label');row.className='puppet-edit-range';const caption=document.createElement('span');caption.className='range-label';const text=document.createElement('span');text.textContent='Intensidad';const output=document.createElement('output');caption.append(text,output);const input=document.createElement('input');input.type='range';Object.assign(input,{min:0,max:1,step:.01});input.setAttribute('aria-label','Intensidad · '+title+' · Fuente '+card.slot.id);row.append(caption,input);fields.append(row);
  const refresh=()=>{const hide=enabled==='puppetCyberGlow'&&card.slot.avatar!=='thoxer-puppet';label.hidden=row.hidden=hide;label.style.display=row.style.display=hide?'none':'';check.checked=!!(card.slot[enabled]??(enabled==='puppetCyberGlow'));input.value=card.slot[amount]??fallback;input.disabled=!check.checked;output.textContent=Math.round((card.slot[amount]??fallback)*100)+'%';};refreshers.push(refresh);
  check.addEventListener('change',()=>{card.slot[enabled]=check.checked;refresh();save(card);});input.addEventListener('input',()=>{card.slot[amount]=Number(input.value);refresh();save(card);});
 }
 const hint=document.createElement('p');hint.className='sound-hint';root.append(hint);
 function refresh(){fields.disabled=card.slot.puppetEyeGlow===undefined;hint.textContent=fields.disabled?'Reinicia el receptor para activar estos ajustes.':'Brillo independiente para los ojos y las marcas de color del dragón.';for(const update of refreshers)update();}
 card.refresh.push(refresh);refresh();return root;
}
