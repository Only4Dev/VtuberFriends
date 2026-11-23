import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {mkdtemp,readFile,writeFile} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join,resolve} from 'node:path';import {createServer} from 'node:net';
const exe=resolve('artifacts/win-x64/VtuberFriends.exe'),port=17869,url='http://127.0.0.1:'+port,data=await mkdtemp(join(tmpdir(),'vf-testmode-')),config=join(data,'config.json');await writeFile(config,JSON.stringify({Port:port}));
const wait=ms=>new Promise(r=>setTimeout(r,ms));let app;const sockets=[];
async function start(){await new Promise((resolve,reject)=>{const s=createServer();s.on('error',reject);s.listen(port,'127.0.0.1',()=>s.close(resolve));});app=spawn(exe,['--config',config,'--data-dir',join(data,'local'),'--no-panel'],{windowsHide:true,stdio:'ignore',env:{...process.env,VF_DISCORD_BOT_TOKEN:''}});for(let i=0;i<100;i++){try{return await(await fetch(url+'/api/state')).json();}catch{await wait(100);}}throw Error('startup');}
async function stop(){await fetch(url+'/api/app/exit',{method:'POST',headers:{'X-VF-Panel':'1'}});await Promise.race([new Promise(r=>app.once('exit',r)),wait(5000)]);assert(app.exitCode!==null);}
const headers={'Content-Type':'application/json','X-VF-Panel':'1'};
try{let state=await start();assert.equal(state.testMode,false);assert.equal(state.receiver.status,'unconfigured');
 for(let i=0;i<7;i++)assert((await fetch(url+'/api/slots',{method:'POST',headers})).ok);state=await(await fetch(url+'/api/state')).json();
 for(let i=0;i<7;i++){const slot={...state.slots[i],userId:i===6?null:String(123456789012345670n+BigInt(i)),enabled:i<5,opacity:.4+i*.05,avatar:'cyan-puppet'};assert((await fetch(url+'/api/slots/'+(i+1),{method:'PUT',headers,body:JSON.stringify(slot)})).ok);}
 state=await(await fetch(url+'/api/state')).json();const before=state.slots,bytes=await readFile(join(data,'local','avatars.json')),configBytes=await readFile(config),observed=[];
 const socket=new WebSocket(url.replace('http','ws')+'/api/live');sockets.push(socket);socket.onmessage=event=>{const m=JSON.parse(event.data);if(m.type==='levels')observed.push(m.data.testMode);};await wait(120);
 assert.equal((await fetch(url+'/api/test-mode',{method:'PUT',headers:{'Content-Type':'application/json'},body:'{"enabled":true}'})).status,403);
 assert.equal((await fetch(url+'/api/test-mode',{method:'PUT',headers:{...headers,Origin:'https://untrusted.invalid'},body:'{"enabled":true}'})).status,403);
 assert((await fetch(url+'/api/test-mode',{method:'PUT',headers,body:'{"enabled":true}'})).ok);await wait(120);assert(observed.includes(true));
 state=await(await fetch(url+'/api/state')).json();assert.equal(state.testMode,true);assert.deepEqual(state.slots,before);assert.deepEqual(state.participants,[]);assert.deepEqual(state.users,[]);assert.equal(state.receiver.status,'unconfigured');
 const second=[];const late=new WebSocket(url.replace('http','ws')+'/api/live');sockets.push(late);late.onmessage=e=>{const m=JSON.parse(e.data);if(m.type==='levels')second.push(m.data.testMode);};await wait(120);assert(second.includes(true));
 assert((await fetch(url+'/api/test-mode',{method:'PUT',headers,body:'{"enabled":false}'})).ok);await wait(120);assert.equal(observed.at(-1),false);assert.equal(second.at(-1),false);
 assert.deepEqual(await readFile(join(data,'local','avatars.json')),bytes);assert.deepEqual(await readFile(config),configBytes);
 await fetch(url+'/api/test-mode',{method:'PUT',headers,body:'{"enabled":true}'});for(const s of sockets)s.close();await stop();
 state=await start();assert.equal(state.testMode,false);assert.deepEqual(state.slots,before);await stop();
 console.log('PASS: transient test mode shared across sources and reloads, origin/header guards, no real participants/audio/network login, seven slot/config bytes unchanged, reset on restart.');
}finally{for(const s of sockets)s.close();if(app&&app.exitCode===null)app.kill();}
