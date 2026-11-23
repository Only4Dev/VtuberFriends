import {createServer} from 'node:net';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';import {join,resolve} from 'node:path';
const exe=resolve(process.argv[2]||'artifacts/win-x64/VtuberFriends.exe'),port=17864,url='http://127.0.0.1:'+port;
await new Promise((resolve,reject)=>{const check=createServer();check.on('error',reject);check.listen(port,'127.0.0.1',()=>check.close(resolve));});
const data=await mkdtemp(join(tmpdir(),'vf-perf-'));const app=spawn(exe,['--demo','--port',String(port),'--data-dir',data],{windowsHide:true,stdio:'ignore',env:{...process.env,DOTNET_GCHeapHardLimit:'0x20000000',VF_DISCORD_BOT_TOKEN:''}});const sockets=[];
const wait=ms=>new Promise(r=>setTimeout(r,ms));
try{
 let state;for(let i=0;i<100;i++){try{state=await (await fetch(url+'/api/state')).json();break;}catch{await wait(100);}}
 assert(state,'server startup');if(state.slots.length===0){for(let i=0;i<7;i++)assert((await fetch(url+'/api/slots',{method:'POST',headers:{'X-VF-Panel':'1'}})).ok);state=await(await fetch(url+'/api/state')).json();}const settings=await(await fetch(url+'/api/settings')).json();assert.equal(settings.demo,true);assert(!('token' in settings));
 assert.equal((await fetch(url+'/api/settings/connect',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({guildId:'x',channelId:'y'})})).status,403);
 assert.equal((await fetch(url+'/api/settings/connect',{method:'POST',headers:{'Content-Type':'application/json','X-VF-Panel':'1'},body:JSON.stringify({guildId:'x',channelId:'y'})})).status,400);
 const measurements=Array.from({length:8},()=>({frames:0,bytes:0,slotUpdates:0,opacity:0}));
 for(const m of measurements){const socket=new WebSocket(url.replace('http','ws')+'/api/live');sockets.push(socket);socket.onmessage=e=>{const p=JSON.parse(e.data);if(p.type==='levels'){m.frames++;m.bytes+=Buffer.byteLength(e.data);}if(p.type==='slots'){m.slotUpdates++;m.opacity=p.data[0].opacity;}};}
 await wait(400);assert(measurements.every(m=>m.frames>0),'all eight streams must open');for(const m of measurements){m.frames=0;m.bytes=0;}
 const began=performance.now();await wait(2000);const seconds=(performance.now()-began)/1000;
 const measuredMinimumFps=Math.round(Math.min(...measurements.map(m=>m.frames))/seconds);
 const bytesPerSecond=measurements.reduce((s,m)=>s+m.bytes,0)/seconds;assert(measurements.every(m=>m.frames>=35),'streams must remain responsive');
 const slot={...state.slots[0],opacity:.42};assert((await fetch(url+'/api/slots/1',{method:'PUT',headers:{'Content-Type':'application/json','X-VF-Panel':'1'},body:JSON.stringify(slot)})).ok);await wait(200);assert(measurements.every(m=>m.slotUpdates>=2&&m.opacity===.42),'settings updates reach all sources');
 const report={scenario:'Synthetic demo, 1 panel + 7 sources; no browser/GPU or real Discord',clients:8,fullStateBytes:Buffer.byteLength(JSON.stringify(state)),previousPollingRequestsPerSecond:20+7*30,previousEstimatedJsonBytesPerSecond:Buffer.byteLength(JSON.stringify(state))*(20+7*30),measuredLiveJsonBytesPerSecond:Math.round(bytesPerSecond),minimumFramesPerSecond:measuredMinimumFps,settingsBroadcast:true};
 await writeFile('artifacts/performance-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 for(const socket of sockets)socket.close();
 const start=performance.now();await fetch(url+'/api/app/exit',{method:'POST',headers:{'X-VF-Panel':'1'}}).catch(()=>{});await Promise.race([new Promise(r=>app.once('exit',r)),wait(5000)]);assert(app.exitCode!==null,'graceful shutdown including streams');console.log('PASS: eight concurrent WebSockets, compact levels, settings broadcast, setup API guards and shutdown; '+Math.round(performance.now()-start)+' ms.');
}finally{for(const s of sockets)s.close();if(app.exitCode===null)app.kill();}
