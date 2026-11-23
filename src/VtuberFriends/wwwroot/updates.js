import {dismissible} from './dialogs.js?v=__UI_VERSION__';
import {t} from './i18n.js?v=__UI_VERSION__';
export function mountUpdates(){
 const settings=document.querySelector('#settingsDialog'),root=document.createElement('section');root.className='update-panel';root.innerHTML='<h3>Actualizaciones</h3><p>Las actualizaciones conservan tus fuentes, ajustes, token y sonidos. Instala cuando termines el directo.</p><label><input type="checkbox" data-startup> Buscar al abrir el panel</label><div class="sound-actions"><button type="button" data-check class="sound-button">Buscar actualizaciones</button></div><p data-status role="status"></p>';settings.append(root);
 const banner=document.createElement('section');banner.className='update-banner';banner.hidden=true;banner.innerHTML='<div><strong data-update-title></strong><p>Se descargará, verificará e instalará el parche. La app se reiniciará al terminar.</p></div><div class="sound-actions"><button type="button" data-changelog class="sound-button">Ver changelog</button><button type="button" data-update class="copy-button">Actualizar</button></div><span data-progress role="status"></span>';document.querySelector('main').prepend(banner);
 const check=root.querySelector('[data-check]'),update=banner.querySelector('[data-update]'),changelog=banner.querySelector('[data-changelog]'),message=root.querySelector('[data-status]'),progress=banner.querySelector('[data-progress]'),startup=root.querySelector('[data-startup]');let current={},busy=false;
 try{startup.checked=localStorage.getItem('vf.updates.check')!=='0';}catch{startup.checked=true;}startup.onchange=()=>{try{localStorage.setItem('vf.updates.check',startup.checked?'1':'0');}catch{}};
 function paint(state){current=state;message.textContent='v'+(state.version||'')+' · '+(state.message||'Sin comprobar.');banner.hidden=!state.latestVersion||state.state==='current';banner.querySelector('[data-update-title]').textContent=t('Actualización disponible: versión {version}').replace('{version}',state.latestVersion||'');progress.textContent=state.message||'';update.disabled=busy||!['available','ready'].includes(state.state);check.disabled=busy;}
 async function post(action){const r=await fetch('/api/updates/'+action,{method:'POST',headers:{'X-VF-Panel':'1'}});if(!r.ok)throw Error();return action==='install'?null:await r.json();}
 async function checkNow(){if(busy)return;busy=true;check.disabled=true;try{paint(await post('check'));}catch{current={...current,message:'No se pudo consultar GitHub. Puedes volver a intentarlo; la app sigue funcionando.'};}finally{busy=false;paint(current);}}
 async function install(){if(busy||!['available','ready'].includes(current.state))return;busy=true;check.disabled=update.disabled=true;try{
  progress.textContent='Descargando y verificando el parche…';
  if(current.state!=='ready')paint(await post('download'));
  if(current.state!=='ready')return;
  progress.textContent='Instalando. La ventana se abrirá de nuevo al terminar.';
  await post('install');
 }catch{progress.textContent='No se pudo completar la actualización. Tus ajustes se conservan.';}finally{busy=false;update.disabled=!['available','ready'].includes(current.state);check.disabled=false;}}
 function showChangelog(){const dialog=dismissible(document.createElement('dialog'));dialog.className='update-changelog';const heading=document.createElement('h2');heading.textContent='Changelog · v'+(current.latestVersion||current.version||'');const notes=document.createElement('pre');notes.textContent=current.notes||t('No se publicaron notas para esta versión.');dialog.append(heading,notes);if(current.changelogUrl){const link=document.createElement('a');link.href=current.changelogUrl;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Ver en GitHub';dialog.append(link);}document.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.showModal();}
 check.onclick=checkNow;update.onclick=install;changelog.onclick=showChangelog;document.addEventListener('vf-language',()=>paint(current));
 if(startup.checked)void checkNow();else fetch('/api/updates').then(r=>r.json()).then(paint).catch(()=>{});
 return {paint,checkNow,install,root,banner};
}
