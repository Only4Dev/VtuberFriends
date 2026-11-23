import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {mkdtemp,readFile} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join,resolve} from 'node:path';import {createServer} from 'node:net';
const exe=resolve(process.argv[2]||'artifacts/win-x64/VtuberFriends.exe'),port=17870,url='http://127.0.0.1:'+port,data=await mkdtemp(join(tmpdir(),'vf-panel-close-')),wait=ms=>new Promise(r=>setTimeout(r,ms));let app;const sockets=[];
async function start(){await new Promise((resolve,reject)=>{const s=createServer();s.on('error',reject);s.listen(port,'127.0.0.1',()=>s.close(resolve));});app=spawn(exe,['--demo','--port',String(port),'--data-dir',data],{windowsHide:true,stdio:'ignore'});for(let i=0;i<100;i++){try{return await(await fetch(url+'/api/state')).json();}catch{await wait(100);}}throw Error('startup');}
async function socket(path){const s=new WebSocket(url.replace('http','ws')+path);sockets.push(s);await new Promise((resolve,reject)=>{s.onopen=resolve;s.onerror=reject;});return s;}
async function exited(max=5000){await Promise.race([new Promise(r=>app.once('exit',r)),wait(max)]);assert(app.exitCode!==null,'process left running');}
try{
 let state=await start();if(state.slots.length===0){assert((await fetch(url+'/api/slots',{method:'POST',headers:{'X-VF-Panel':'1'}})).ok);state=await(await fetch(url+'/api/state')).json();}let slot={...state.slots[0],userId:'123456789012345678',enabled:true,opacity:.63};assert((await fetch(url+'/api/slots/1',{method:'PUT',headers:{'Content-Type':'application/json','X-VF-Panel':'1'},body:JSON.stringify(slot)})).ok);const saved=await readFile(join(data,'demo-avatars.json'));
 assert(!(await(await fetch(url+'/overlay/1')).text()).includes('panel-lifetime'));
 assert.equal((await fetch(url+'/api/panel-lifetime',{headers:{Origin:'https://untrusted.invalid'}})).status,403);
 const live=await socket('/api/live');await wait(2200);assert.equal(app.exitCode,null,'headless/source-only must stay running');
 const first=await socket('/api/panel-lifetime'),second=await socket('/api/panel-lifetime');first.close();await wait(2200);assert.equal(app.exitCode,null,'second panel still open');
 // Refresh closes a page briefly. A new lease cancels shutdown; minimizing never closes its lease.
 second.close();await wait(300);const refreshed=await socket('/api/panel-lifetime');await wait(2200);assert.equal(app.exitCode,null,'refresh/minimized panel must survive');
 const began=performance.now();refreshed.close();await exited();const exitMs=Math.round(performance.now()-began);assert.deepEqual(await readFile(join(data,'demo-avatars.json')),saved);
 assert.equal(app.exitCode,0);live.close();
 state=await start();assert.equal(state.slots[0].opacity,.63);const panel=await socket('/api/panel-lifetime');const explicit=performance.now();await fetch(url+'/api/app/exit',{method:'POST',headers:{'X-VF-Panel':'1'}}).catch(()=>{});await exited();assert(Math.round(performance.now()-explicit)<2500);assert.deepEqual(await readFile(join(data,'demo-avatars.json')),saved);panel.close();
 console.log('PASS: last panel closes process ('+exitMs+' ms), live sources cannot keep it alive; multi-panel, refresh/minimize, headless mode, explicit exit, origin guard and saved settings preserved. Simulated panel WebSocket/page close; no real Discord or browser windows.');
}finally{for(const s of sockets)s.close();if(app&&app.exitCode===null)app.kill();}
