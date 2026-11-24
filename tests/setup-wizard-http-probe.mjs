import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {mkdtemp,writeFile,readFile,mkdir,rm} from 'node:fs/promises';import {join,resolve} from 'node:path';import {tmpdir} from 'node:os';
const exe=resolve('artifacts/win-x64/VtuberFriends.exe'),port=17879,url=`http://127.0.0.1:${port}`,wait=ms=>new Promise(r=>setTimeout(r,ms)),headers={'X-VF-Panel':'1','Content-Type':'application/json'};
for(const kind of ['partial-id','custom-port','saved-token','saved-sources','demo']){
 const root=await mkdtemp(join(tmpdir(),'vf-wizard-api-')),data=join(root,'.local'),config=join(root,'config.json');await mkdir(data);
 const cfg=kind==='partial-id'?{GuildId:'not-a-valid-id',Port:port}:{Port:port};await writeFile(config,JSON.stringify(cfg));
 if(kind==='saved-token')await writeFile(join(data,'bot-token.dpapi'),'SYNTHETIC_TOKEN_SENTINEL');
 if(kind==='saved-sources')await writeFile(join(data,'avatars.json'),'[{"Id":7,"Enabled":false,"Avatar":"cyan-puppet","Opacity":0.65}]');
 const configBefore=await readFile(config),sourceBefore=kind==='saved-sources'?await readFile(join(data,'avatars.json')):null;
 let app;async function start(){app=spawn(exe,['--config',config,'--data-dir',data,'--no-panel','--port',String(port),...(kind==='demo'?['--demo']:[])],{windowsHide:true,stdio:'ignore',env:{...process.env,VF_DISCORD_BOT_TOKEN:''}});for(let i=0;i<100;i++){try{return await(await fetch(url+'/api/setup-wizard')).json();}catch{await wait(100);}}throw Error('startup');}
 async function stop(){await fetch(url+'/api/app/exit',{method:'POST',headers});await Promise.race([new Promise(r=>app.once('exit',r)),wait(5000)]);assert.equal(app.exitCode,0);}
 try{
  const initial=await start();assert.equal(initial.shouldAutoOpen,false,kind);
  assert.equal((await fetch(url+'/api/setup-wizard',{method:'PUT',headers:{'Content-Type':'application/json'},body:'{"outcome":"skipped"}'})).status,403);
  assert.equal((await fetch(url+'/api/setup-wizard',{method:'PUT',headers:{...headers,Origin:'https://evil.invalid'},body:'{"outcome":"skipped"}'})).status,403);
  assert.equal((await fetch(url+'/api/setup-wizard',{method:'PUT',headers,body:'{"outcome":"reset-everything"}'})).status,400);
  for(const outcome of ['skipped','completed']){assert((await fetch(url+'/api/setup-wizard',{method:'PUT',headers,body:JSON.stringify({outcome})})).ok);const state=await(await fetch(url+'/api/setup-wizard')).json();assert.equal(state.outcome,outcome);assert.equal(state.shouldAutoOpen,false);}
  await stop();assert.equal((await start()).shouldAutoOpen,false);await stop();
  assert.deepEqual(await readFile(config),configBefore);if(sourceBefore)assert.deepEqual(await readFile(join(data,'avatars.json')),sourceBefore);
  if(kind==='saved-token')assert.equal(await readFile(join(data,'bot-token.dpapi'),'utf8'),'SYNTHETIC_TOKEN_SENTINEL');
 }finally{if(app?.exitCode===null){await fetch(url+'/api/app/exit',{method:'POST',headers}).catch(()=>{});await wait(500);if(app.exitCode===null)app.kill();}await rm(root,{recursive:true,force:true});}
}
console.log('PASS: wizard suppresses configured/partial/custom-port/demo setups, persists skip/completed through restart, guards writes and preserves private bytes. Real HTTP; fresh defaults covered separately without binding the user port. No Discord/browser.');
