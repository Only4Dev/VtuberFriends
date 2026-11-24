import {setLanguage} from './i18n.js?v=__UI_VERSION__';
import {puppetPacks} from './puppet/packs.js?v=__UI_VERSION__';
import {switchAccessoryAvatar} from './puppet/accessory-profiles.js?v=__UI_VERSION__';

const L=(es,en)=>document.documentElement.lang==='en'?en:es;
const idOK=value=>/^[0-9]{17,20}$/.test(value);
const titles=()=>[
 L('Bienvenido a tu estudio','Welcome to your studio'),
 L('Activa el modo desarrollador','Enable Developer Mode'),
 L('Crea tu bot de Discord','Create your Discord bot'),
 L('Invita el bot a tu servidor','Invite the bot to your server'),
 L('Copia el servidor y el canal','Copy your server and channel IDs'),
 L('Conecta con Discord','Connect to Discord'),
 L('Prepara tu primer avatar','Prepare your first avatar'),
 L('Añade la fuente en Streamlabs','Add the source in Streamlabs'),
 L('Prueba tu voz y termina','Test your voice and finish')];

function node(tag,text,className){const e=document.createElement(tag);if(text)e.textContent=text;if(className)e.className=className;return e;}
function button(text,fn,className='sound-button'){const b=node('button',text,className);b.type='button';b.onclick=fn;return b;}
function link(text,url){const a=node('a',text,'wizard-link');a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;}

export function mountSetupWizard(){
 const dialog=node('dialog',null,'setup-wizard');dialog.id='setupWizard';dialog.setAttribute('data-no-translate','');dialog.setAttribute('aria-labelledby','wizardTitle');
 const header=node('header',null,'wizard-header'),brand=node('strong','V&F · Setup wizard');
 const language=node('select');language.setAttribute('aria-label','Idioma / Language');
 for(const [value,label]of [['es','Español'],['en','English']]){const o=node('option',label);o.value=value;language.append(o);}
 const close=button('×',()=>leave(),'dialog-x');close.setAttribute('aria-label',L('Omitir asistente y cerrar','Skip wizard and close'));header.append(brand,language,close);
 const layout=node('div',null,'wizard-layout'),nav=node('nav',null,'wizard-steps'),body=node('section',null,'wizard-body');nav.setAttribute('aria-label','Setup steps');
 const progress=node('p',null,'wizard-progress'),heading=node('h2');heading.id='wizardTitle';heading.tabIndex=-1;
 const content=node('div',null,'wizard-content'),status=node('p',null,'wizard-message');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const footer=node('footer',null,'wizard-footer'),skip=button('',()=>leave()),back=button('',()=>go(step-1)),next=button('',()=>go(step+1),'copy-button');footer.append(skip,back,next);body.append(progress,heading,content,status,footer);layout.append(nav,body);dialog.append(header,layout);document.body.append(dialog);
 let step=0,busy=false,settings={},latest=null,selectedId=null,loaded=false,lastPaint=0,observedAudio=false,audioUserId=null,baselineFrames=0,streamConfirmed=false,notice='';
 const draft={applicationId:'',guildId:'',channelId:'',userId:'',avatar:'cyan-puppet'};
 function activeSlot(){return latest?.slots?.find(s=>s.id===selectedId);}
 function connected(){return latest?.receiver?.mode!=='demo'&&latest?.receiver?.status==='connected';}
 function canFinish(){const s=activeSlot();return connected()&&s?.enabled&&s.userId&&audioUserId===s.userId&&latest?.participants?.some(p=>p.userId===s.userId)&&observedAudio&&streamConfirmed&&!latest?.testMode;}
 async function call(path,body,method='POST'){
  const response=await fetch(path,{method,headers:{'X-VF-Panel':'1','Content-Type':'application/json'},body:JSON.stringify(body)});
  const value=response.status===204?null:await response.json();if(!response.ok)throw Error('request');return value;
 }
 async function task(fn){if(busy)return;busy=true;paintButtons();status.textContent=L('Un momento…','One moment…');try{await fn();}catch{notice=L('No se pudo completar. Revisa los datos y vuelve a intentarlo.','Could not complete this step. Check the details and retry.');}finally{busy=false;if(dialog.open)render();}}
 async function refresh(){const response=await fetch('/api/state');if(!response.ok)throw Error('state');latest=await response.json();}
 async function open(){if(busy||dialog.open)return;notice='';try{
  const response=await fetch('/api/settings');if(!response.ok)throw Error();settings=await response.json();await refresh();
  draft.guildId=settings.guildId||'';draft.channelId=settings.channelId||'';
  if(selectedId&&!activeSlot())selectedId=null;
  observedAudio=false;audioUserId=null;streamConfirmed=false;baselineFrames=latest.users?.find(u=>u.userId===activeSlot()?.userId)?.frames||0;
  // Never choose or edit a configured source automatically.
  loaded=true;step=0;render();dialog.showModal();heading.focus();
 }catch{notice=L('No se pudo abrir el asistente. Comprueba que la app siga abierta.','Could not open the wizard. Check that the app is still running.');const toast=document.querySelector('#toast');if(toast){toast.textContent=notice;toast.classList.add('show');}}}
 async function leave(){if(busy)return;await task(async()=>{await call('/api/setup-wizard',{outcome:'skipped'},'PUT');dialog.close();});}
 function go(index){if(busy)return;step=Math.max(0,Math.min(8,index));notice='';render();heading.focus();}
 function paintButtons(){skip.textContent=L('Omitir asistente','Skip wizard');back.textContent=L('Atrás','Back');next.textContent=step===8?L('Terminar configuración','Finish setup'):L('Siguiente','Next');back.disabled=busy||step===0;skip.disabled=busy;close.disabled=busy;language.disabled=busy;next.disabled=busy||(step===4&&(!idOK(draft.guildId)||!idOK(draft.channelId)))||(step===5&&!connected())||((step===6||step===7)&&(!activeSlot()?.enabled||!activeSlot()?.userId))||(step===8&&!canFinish());for(const b of nav.querySelectorAll('button'))b.disabled=busy;for(const e of content.querySelectorAll('button,input,select'))e.disabled=busy;}
 function paragraph(es,en,cls){content.append(node('p',L(es,en),cls));}
 function steps(rows){const list=node('ol',null,'wizard-instructions');for(const [es,en]of rows)list.append(node('li',L(es,en)));content.append(list);}
 function field(label,key,{type='text',placeholder=''}={}){const wrap=node('label',L(...label),'wizard-field'),input=node('input');input.name=key;input.type=type;input.value=draft[key]||'';input.placeholder=placeholder;input.autocomplete='off';input.spellcheck=false;if(type==='text')input.inputMode='numeric';input.addEventListener('input',()=>{draft[key]=input.value.trim();notice='';paintButtons();});wrap.append(input);content.append(wrap);return input;}
 function illustration(kind){
  const figure=node('figure',null,'wizard-illustration');figure.setAttribute('aria-label',L('Ilustración orientativa','Illustrative guide'));
  const label=node('figcaption',L('GUÍA VISUAL · los nombres pueden variar según Discord','VISUAL GUIDE · Discord labels may vary'));figure.append(label);
  const rows=kind==='developer'?['⚙  '+L('Ajustes de usuario','User Settings'),'›  '+L('Desarrollador / Avanzado','Developer / Advanced'),'✓  '+L('Modo desarrollador — ACTIVADO','Developer Mode — ON')]:kind==='invite'?['Discord Developer Portal','OAuth2 → URL Generator','✓ bot    ✓ View Channels    ✓ Connect']:kind==='ids'?[L('Clic derecho en el servidor','Right-click the server'),'↓  '+L('Copiar ID del servidor','Copy Server ID'),L('Clic derecho en el canal de voz','Right-click the voice channel'),'↓  '+L('Copiar ID del canal','Copy Channel ID')]:['Streamlabs → '+L('Fuentes','Sources')+' → +',L('Fuente de navegador','Browser Source'),'URL  http://127.0.0.1:…/overlay/…','1440 × 1080'];
  for(const text of rows)figure.append(node('div',text));content.append(figure);
 }
 function sourceURL(){return activeSlot()?location.origin+'/overlay/'+selectedId:'';}
 function render(){
  const names=titles();language.value=document.documentElement.lang==='en'?'en':'es';nav.replaceChildren();
  names.forEach((name,index)=>{const b=button((index+1)+'. '+name,()=>go(index),'wizard-step');if(index===step)b.setAttribute('aria-current','step');nav.append(b);});
  progress.textContent=L('PASO ','STEP ')+(step+1)+' / '+names.length;heading.textContent=names[step];content.replaceChildren();status.textContent=notice;
  if(step===0){
   paragraph('Deja tu bot conectado y un avatar listo para responder a tu voz. Solo tú, como streamer, instalas esta app. Tus invitados usan Discord normal.','Connect your bot and prepare one avatar to respond to your voice. Only you, the streamer, install this app. Guests use regular Discord.');
   steps([['Necesitas Discord, Streamlabs y permiso «Gestionar servidor» en el servidor que usarás.','You need Discord, Streamlabs and “Manage Server” permission in the server you will use.'],['Crearemos tu propio bot, conectaremos un canal de voz y añadiremos una fuente de navegador.','We will create your own bot, connect a voice channel and add a browser source.'],['Puedes ir atrás, cambiar de idioma u omitir el asistente. Nada se configura hasta que pulses los botones de guardar.','Go back, change language or skip at any time. Nothing is configured until you press a save button.']]);
   if(latest?.slots?.length||settings.hasToken||settings.guildId||settings.channelId)paragraph('Ya hay datos guardados. El asistente no los reinicia. Solo cambia lo que guardes explícitamente.','Saved data was found. The wizard does not reset it. Only changes you explicitly save are applied.','wizard-callout');
  }
  if(step===1){
   illustration('developer');steps([['En Discord de escritorio, pulsa el engranaje junto a tu nombre para abrir Ajustes de usuario.','In desktop Discord, click the cog next to your name to open User Settings.'],['Busca Desarrollador → Modo desarrollador y actívalo. En otras versiones está en Avanzado; también puedes buscar «modo desarrollador» en los ajustes.','Open Developer → Developer Mode and enable it. Some versions put it under Advanced; you can also search settings for “developer mode”.'],['Cierra los ajustes. Ahora aparecerá «Copiar ID» al hacer clic derecho en servidores, canales y usuarios.','Close settings. Right-clicking servers, channels and users will now offer “Copy ID”.']]);
   content.append(link(L('Ayuda oficial de Discord sobre IDs','Official Discord ID guide'),'https://support.discord.com/hc/en-us/articles/206346498-Where-can-I-find-my-User-Server-Message-ID'));
  }
  if(step===2){
   content.append(link(L('Abrir Discord Developer Portal','Open Discord Developer Portal'),'https://discord.com/developers/applications'));
   steps([['Inicia sesión en el portal con tu cuenta de Discord. Pulsa New Application, elige un nombre y acepta los términos para crearla.','Sign in to the portal with your Discord account. Click New Application, choose a name and accept the terms to create it.'],['En General Information copia Application ID. Es un número público: no es el token ni el ID de tu usuario.','In General Information copy Application ID. This is a public number: it is not the token or your user ID.'],['Abre Bot. Las aplicaciones nuevas ya suelen incluir un bot; si aparece Add Bot, úsalo. Deja Require OAuth2 Code Grant desactivado.','Open Bot. New applications usually include a bot; use Add Bot if it appears. Leave Require OAuth2 Code Grant disabled.'],['No necesitas activar Presence Intent, Server Members Intent ni Message Content Intent. La app usa eventos de servidor y voz, no lee tus mensajes.','You do not need Presence Intent, Server Members Intent or Message Content Intent. The app uses server and voice events, not your messages.']]);
   field(['Application ID del bot','Bot Application ID'],'applicationId',{placeholder:'123456789012345678'});
   paragraph('Puedes reutilizar tu propio bot si ya tienes uno. No necesitas programar nada ni instalar herramientas de desarrollo.','You can reuse your own bot if you have one. No coding or developer tools are required.','wizard-callout');
  }
  if(step===3){
   illustration('invite');steps([['En Installation, habilita Guild Install (instalación en servidor). Este bot se instala en un servidor, no solo en tu cuenta.','In Installation, enable Guild Install. This bot must be installed in a server, not just your account.'],['En OAuth2 → URL Generator marca solo el ámbito bot. En Bot Permissions marca Ver canales (View Channels) y Conectar (Connect). No marques Administrador.','In OAuth2 → URL Generator select the bot scope. Under Bot Permissions select View Channels and Connect. Do not select Administrator.'],['Abre la URL generada, elige tu servidor, pulsa Continuar / Autorizar y completa el captcha. Debes poder gestionar ese servidor.','Open the generated URL, choose your server, click Continue / Authorize and complete the captcha. You must have permission to manage that server.'],['El bot aparece en la lista de miembros. Estará desconectado hasta que esta app lo conecte. En canales privados, sus permisos del canal también deben permitir Ver canal y Conectar.','The bot appears in the member list. It will stay offline until this app connects it. Private-channel overrides must also allow View Channel and Connect.']]);
   const input=field(['Application ID (para generar el enlace)','Application ID (to generate the link)'],'applicationId',{placeholder:'123456789012345678'}),area=node('div');
   function invite(){area.replaceChildren();if(idOK(input.value.trim()))area.append(link(L('Invitar mi bot al servidor','Invite my bot to the server'),'https://discord.com/oauth2/authorize?client_id='+input.value.trim()+'&scope=bot&permissions=1049600'));else area.append(node('p',L('Pega el Application ID para mostrar el enlace de invitación.','Paste the Application ID to show the invitation link.')));}
   input.addEventListener('input',invite);content.append(area);invite();
  }
  if(step===4){
   illustration('ids');steps([['En Discord, clic derecho en el icono o nombre de tu servidor → Copiar ID del servidor. Pégalo en Servidor.','In Discord, right-click your server icon or name → Copy Server ID. Paste it under Server.'],['Clic derecho en el canal de VOZ que usarás → Copiar ID del canal. No copies una categoría, un mensaje ni un canal de texto.','Right-click the VOICE channel you will use → Copy Channel ID. Do not copy a category, message or text channel.'],['Entra tú en ese canal de voz y deja el micrófono disponible. El bot se conectará al mismo canal en el siguiente paso.','Join that voice channel yourself and keep your microphone available. The bot will join the same channel in the next step.']]);
   field(['Servidor (ID)','Server ID'],'guildId',{placeholder:'123456789012345678'});field(['Canal de voz (ID)','Voice channel ID'],'channelId',{placeholder:'123456789012345678'});
  }
  if(step===5){
   field(['Servidor (ID)','Server ID'],'guildId');field(['Canal de voz (ID)','Voice channel ID'],'channelId');
   paragraph('En el portal → Bot → Token, pulsa Reset Token si necesitas generarlo; completa la verificación y copia el token. Pégalo abajo sin comillas ni el prefijo «Bot». No uses Public Key ni Client Secret.','In the portal → Bot → Token, click Reset Token if you need to generate it; complete verification and copy the token. Paste it below without quotes or the “Bot” prefix. Do not use Public Key or Client Secret.');
   const label=node('label',L('Token del bot','Bot token'),'wizard-field'),token=node('input');token.type='password';token.name='wizardToken';token.autocomplete='new-password';token.maxLength=512;token.placeholder=settings.hasToken?L('Vacío conserva el token cifrado','Leave blank to keep the encrypted token'):L('Pega aquí el token','Paste the token here');label.append(token);content.append(label);
   paragraph('El token se guarda cifrado para tu usuario de Windows y nunca se muestra de nuevo. No lo compartas ni lo pegues en capturas. Si ya hay uno guardado, no pulses Reset Token: deja este campo vacío.','The token is encrypted for your Windows account and is never displayed again. Do not share it or include it in screenshots. If one is already saved, do not reset it: leave this field blank.','wizard-callout');
   content.append(button(L('Guardar y conectar','Save and connect'),()=>task(async()=>{
    if(!idOK(draft.guildId)||!idOK(draft.channelId)){notice=L('Servidor y canal deben ser IDs de 17 a 20 dígitos.','Server and channel must be 17–20 digit IDs.');return;}
    if(!settings.hasToken&&!token.value.trim()){notice=L('Falta el token del bot.','The bot token is missing.');return;}
    const payload={guildId:draft.guildId,channelId:draft.channelId,token:token.value.trim()||null};token.value='';
    try{await call('/api/settings/connect',payload);}finally{payload.token=null;}
    settings=await(await fetch('/api/settings')).json();await refresh();notice=connected()?L('Bot conectado. Continúa con tu avatar.','Bot connected. Continue to your avatar.'):L('Todavía no está conectado. Revisa token, IDs, invitación y permisos del canal. Puedes volver a intentar.','Not connected yet. Check the token, IDs, invitation and channel permissions, then retry.');
   }),'copy-button'));
   const state=node('p',null,'wizard-connection');state.dataset.wizardConnection='';content.append(state);
   paragraph('Si la conexión tarda, espera hasta 90 segundos. Si el token fue regenerado, el anterior deja de funcionar. Si hay un fallo DAVE, consulta Estado de la conexión; no desactives el cifrado.','Connection may take up to 90 seconds. Regenerating a token invalidates the previous one. For DAVE failures, check Connection status; do not disable encryption.');
  }
  if(step===6){
   paragraph('Primero puedes elegir tu propia cuenta para probar. Luego cada invitado tendrá su fuente independiente.','Start with your own account to test. Later, give each guest a separate source.');
   const chooseLabel=node('label',L('Fuente que vas a configurar','Source to configure'),'wizard-field'),choose=node('select');
   const empty=node('option',L('Crear una fuente nueva','Create a new source'));empty.value='';choose.append(empty);
   for(const slot of latest?.slots||[]){const o=node('option',L('Fuente ','Source ')+slot.id);o.value=String(slot.id);choose.append(o);}choose.value=selectedId?String(selectedId):'';
   choose.onchange=()=>{selectedId=choose.value?Number(choose.value):null;const s=activeSlot();if(s){draft.userId=s.userId||'';draft.avatar=s.avatar;}observedAudio=false;streamConfirmed=false;render();};chooseLabel.append(choose);content.append(chooseLabel);
   const participants=latest?.participants||[];
   if(participants.length){const label=node('label',L('Elegir una persona del canal','Choose someone in the channel'),'wizard-field'),select=node('select'),o=node('option',L('Selecciona una persona…','Select someone…'));o.value='';select.append(o);for(const person of participants){const option=node('option',person.name);option.value=person.userId;select.append(option);}select.value=draft.userId;select.onchange=()=>{if(select.value){draft.userId=select.value;content.querySelector('[name=userId]').value=draft.userId;}};label.append(select);content.append(label);}
   steps([['Para copiarlo manualmente: clic derecho en tu nombre (o el del invitado) en Discord → Copiar ID de usuario. No es el nombre ni @usuario.','To copy it manually: right-click your name (or the guest) in Discord → Copy User ID. This is not the display name or @username.']]);
   field(['Usuario de Discord (ID)','Discord user ID'],'userId',{placeholder:'123456789012345678'});
   const label=node('label',L('Elige tu Puppet','Choose your Puppet'),'wizard-field'),select=node('select');for(const [value,pack]of Object.entries(puppetPacks)){const o=node('option',pack.name);o.value=value;select.append(o);}if(!Object.hasOwn(puppetPacks,draft.avatar)){const o=node('option','Legacy · '+draft.avatar);o.value=draft.avatar;select.append(o);}select.value=draft.avatar;select.onchange=()=>{draft.avatar=select.value;};label.append(select);content.append(label);
   content.append(button(selectedId?L('Guardar esta fuente','Save this source'):L('Crear y guardar mi fuente','Create and save my source'),()=>task(async()=>{
    if(!idOK(draft.userId)){notice=L('Introduce un ID de usuario válido (17 a 20 dígitos).','Enter a valid user ID (17–20 digits).');return;}
    let slot;
    if(selectedId){await refresh();slot=activeSlot();if(!slot)throw Error();}
    else{slot=await call('/api/slots',{});selectedId=slot.id;}
    const updated={...structuredClone(slot),userId:draft.userId,enabled:true};if(updated.avatar!==draft.avatar)switchAccessoryAvatar(updated,draft.avatar);
    await call('/api/slots/'+selectedId,updated,'PUT');
    await refresh();baselineFrames=latest.users?.find(u=>u.userId===draft.userId)?.frames||0;observedAudio=false;streamConfirmed=false;
    notice=L('Fuente guardada y «Mostrar» activado. Continúa a Streamlabs.','Source saved and Show enabled. Continue to Streamlabs.');
   }),'copy-button'));
   paragraph('Crear añade una sola fuente. Guardar de nuevo usa esa misma fuente. Elegir una fuente existente no cambia sus otros ajustes.','Create adds one source. Saving again uses that same source. Choosing an existing source keeps its other settings.');
  }
  if(step===7){
   illustration('stream');
   if(!activeSlot())paragraph('Primero crea o selecciona una fuente en el paso anterior.','First create or select a source in the previous step.','wizard-callout');
   const url=node('input');url.readOnly=true;url.value=sourceURL();url.setAttribute('aria-label',L('URL de la fuente','Source URL'));content.append(url,button(L('Copiar URL','Copy URL'),()=>task(async()=>{if(!sourceURL())throw Error();await navigator.clipboard.writeText(sourceURL());notice=L('URL copiada. Pégala en Streamlabs.','URL copied. Paste it into Streamlabs.');})));
   steps([['Abre Streamlabs Desktop → Fuentes → + → Fuente de navegador / Browser Source → Añadir fuente. Ponle un nombre fácil de reconocer.','Open Streamlabs Desktop → Sources → + → Browser Source → Add Source. Give it an easy-to-recognize name.'],['Pega la URL de arriba. Archivo local debe estar desactivado. Ancho: 1440. Alto: 1080. Fondo transparente; no hace falta chroma key.','Paste the URL above. Local file must be off. Width: 1440. Height: 1080. The background is transparent; no chroma key is needed.'],['Confirma y arrastra la fuente en la escena para colocarla. Escálala desde las esquinas. La app debe permanecer abierta durante el directo.','Confirm and drag the source into position in the scene. Scale it from its corners. Keep this app open while streaming.'],['Si la fuente se ve vacía: el usuario asignado debe estar en el canal del bot y «Mostrar» debe estar activo. El modo prueba del panel permite colocar fuentes sin invitados, pero apágalo para probar la voz.','If the source is empty: the assigned user must be in the bot’s channel and Show must be enabled. Panel Test Mode lets you arrange absent guests, but turn it off to test voice.']]);
   paragraph('No podemos comprobar tu escena de Streamlabs automáticamente. El último paso te pedirá confirmar que la ves.','We cannot inspect your Streamlabs scene automatically. The last step asks you to confirm that you can see it.');
  }
  if(step===8){
   steps([['Entra con la cuenta asignada en el mismo canal de voz que el bot. Activa tu micrófono y di «hola, hola».','Join the bot’s voice channel with the assigned account. Enable your microphone and say “hello, hello”.'],['Apaga el modo prueba si está activo. Comprueba que la boca se mueve en Streamlabs al hablar.','Turn off Test Mode if enabled. Check that the mouth moves in Streamlabs when you speak.']]);
   const checklist=node('ul',null,'wizard-checklist');checklist.dataset.wizardChecklist='';content.append(checklist);
   const label=node('label',null,'wizard-confirm'),check=node('input');check.type='checkbox';check.checked=streamConfirmed;check.onchange=()=>{streamConfirmed=check.checked;paintButtons();};label.append(check,document.createTextNode(L('Veo mi avatar en Streamlabs y su boca responde a mi voz.','I can see my avatar in Streamlabs and its mouth responds to my voice.')));content.append(label);
   paragraph('Si no llega voz: verifica el usuario y canal, micrófono sin silenciar, permisos y Estado de la conexión. Si llega audio pero la boca apenas abre, ajusta Sensibilidad y apariencia en la tarjeta.','If voice is missing: verify the user and channel, unmuted microphone, permissions and Connection status. If audio arrives but the mouth barely opens, adjust Sensitivity and appearance on the card.');
   paragraph('Después puedes añadir invitados por su ID aunque aún no estén conectados. Personalizar reúne accesorios, efectos, entrada/salida y sonidos. La X del último panel cierra el receptor; minimizarlo lo mantiene funcionando.','Later, add guests by ID even before they join. Customize contains accessories, effects, entrances/exits and sounds. Closing the last panel stops the receiver; minimizing keeps it running.');
  }
  paintLive();paintButtons();
 }
 function paintLive(){
  const connection=content.querySelector('[data-wizard-connection]');if(connection)connection.textContent=connected()?L('✓ Conectado al canal de voz','✓ Connected to voice channel'):L('○ Aún no conectado.','○ Not connected yet.');
  const list=content.querySelector('[data-wizard-checklist]');if(!list)return;list.replaceChildren();const slot=activeSlot(),present=latest?.participants?.some(p=>p.userId===slot?.userId);
  for(const [ok,text]of [[connected(),L('Bot conectado','Bot connected')],[!!slot?.enabled&&!!slot?.userId,L('Fuente asignada y visible','Source assigned and enabled')],[present,L('Usuario en el canal','User in the channel')],[!latest?.testMode,L('Modo prueba apagado','Test Mode off')],[observedAudio,L('Audio real recibido durante esta prueba','Real audio received during this test')]]){const item=node('li',(ok?'✓ ':'○ ')+text);item.className=ok?'done':'';list.append(item);}
 }
 next.onclick=()=>{if(step!==8){go(step+1);return;}if(!canFinish())return;void task(async()=>{await call('/api/setup-wizard',{outcome:'completed'},'PUT');dialog.close();});};
 language.onchange=()=>setLanguage(language.value);
 document.addEventListener('vf-language',()=>{if(dialog.open)render();});
 dialog.addEventListener('cancel',event=>{event.preventDefault();void leave();});
 dialog.addEventListener('close',()=>{for(const input of dialog.querySelectorAll('input[type=password]'))input.value='';content.replaceChildren();});
 for(const trigger of document.querySelectorAll('[data-setup-wizard]'))trigger.addEventListener('click',()=>{document.querySelector('#settingsDialog')?.close();void open();});
 const settingsButton=button('Setup wizard',()=>{document.querySelector('#settingsDialog')?.close();void open();});settingsButton.dataset.setupWizard='';document.querySelector('#settingsDialog')?.append(settingsButton);
 const ready=fetch('/api/setup-wizard').then(r=>{if(!r.ok)throw Error();return r.json();}).then(state=>{if(state.shouldAutoOpen)return open();}).catch(()=>{});
 return {ready,open,dialog,go,update(state){latest=state;if(!dialog.open||!loaded)return;const slot=activeSlot(),user=state.users?.find(u=>u.userId===slot?.userId);if(connected()&&!state.testMode&&state.participants?.some(p=>p.userId===slot?.userId)&&user?.rms>0&&user.frames>baselineFrames){observedAudio=true;audioUserId=slot.userId;}if(performance.now()-lastPaint<100)return;lastPaint=performance.now();paintLive();paintButtons();}};
}
