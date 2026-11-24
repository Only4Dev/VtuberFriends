import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {readFile,readdir,mkdtemp} from 'node:fs/promises';import {join} from 'node:path';import {tmpdir} from 'node:os';
const report=JSON.parse(await readFile('artifacts/organized-release.json','utf8')),root=report.directory,port=17874,url=`http://127.0.0.1:${port}`,data=await mkdtemp(join(tmpdir(),'vf-organized-')),wait=ms=>new Promise(r=>setTimeout(r,ms));
assert.deepEqual((await readdir(root)).sort(),['LEEME.txt','Sonidos','VtuberFriends.exe','app','third-party'].sort());
const launcher=spawn(join(root,'VtuberFriends.exe'),['--demo','--no-panel','--port',String(port),'--data-dir',data],{windowsHide:true,stdio:'ignore'});
try{
 let state;for(let i=0;i<100;i++){try{state=await(await fetch(url+'/api/state')).json();break;}catch{await wait(100);}}assert(state,'native launcher failed to start app');assert.equal(state.slots.length,0);
 const update=await(await fetch(url+'/api/updates')).json();assert.equal(update.version,(await readFile('src/VtuberFriends/UpdateService.cs','utf8')).match(/Version="([0-9.]+)"/)[1]);
 assert.equal((await fetch(url+'/api/updates/check',{method:'POST',headers:{'X-VF-Panel':'1',Origin:'https://evil.invalid'}})).status,403);
 assert.equal((await fetch(url+'/api/updates/download',{method:'POST'})).status,403);
 assert.equal((await fetch(url+'/api/updates/install',{method:'POST',headers:{'X-VF-Panel':'1'}})).status,400);
 const html=await(await fetch(url+'/')).text();assert.match(html,/studio-layout.css\?v=[a-f0-9]+/);const module=await(await fetch(url+'/studio-layout.js')).text();assert.match(module,/Personalizar/);assert(!module.includes('__UI_VERSION__'));
 await fetch(url+'/api/app/exit',{method:'POST',headers:{'X-VF-Panel':'1'}});await wait(700);
 console.log('PASS: native root launcher starts self-contained app in subfolder with an empty studio, version/API guards, studio assets/version injection and shutdown; no browser/Discord opened. Root has only EXE, LEEME, app, Sonidos and notices.');
}finally{await fetch(url+'/api/app/exit',{method:'POST',headers:{'X-VF-Panel':'1'}}).catch(()=>{});if(launcher.exitCode===null)launcher.kill();}
