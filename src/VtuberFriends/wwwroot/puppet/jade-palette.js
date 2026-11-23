// Runtime palette only: no replacement textures or geometry, and no accessory recolor.
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
export function jadeShinyColor(rgb){
 const [r,g,b]=rgb,mask=smooth(.015,.08,g-Math.max(r,b))*smooth(.04,.14,g);
 const shade=.018+.36*Math.pow(r*.2126+g*.7152+b*.0722,.9),dark=[shade*.94,shade*.96,shade];
 return rgb.map((v,i)=>v+(dark[i]-v)*mask);
}
export function useJadeShiny(rig,definition,glowPass=0){return rig.manifest.id==='jade-dragon'&&!!rig.settings?.jadeShiny&&!definition.accessory&&definition.kind!=='solid'&&!glowPass;}

export function jadePaletteControls(card,save){
 const root=document.createElement('details');root.className='advanced';
 root.innerHTML='<summary>Color del avatar</summary><div class="advanced-content"><label class="show-toggle">Jade shiny <input type="checkbox"></label><p class="sound-hint">Cuerpo negro con los detalles dorados, rojos y ojos originales.</p></div>';
 const check=root.querySelector('input');check.setAttribute('aria-label','Jade shiny · Fuente '+card.slot.id);
 const refresh=()=>{const hidden=card.slot.avatar!=='jade-puppet';root.hidden=hidden;root.style.display=hidden?'none':'';check.checked=!!card.slot.puppetJadeShiny;check.disabled=card.slot.puppetJadeShiny===undefined;root.querySelector('p').textContent=check.disabled?'Reinicia la app para activar esta opción.':'Cuerpo negro con los detalles dorados, rojos y ojos originales.';};
 check.addEventListener('change',()=>{card.slot.puppetJadeShiny=check.checked;save(card);});card.refresh.push(refresh);refresh();return root;
}
