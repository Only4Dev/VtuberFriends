import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {mkdtemp,readFile} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join,resolve} from 'node:path';
const data=await mkdtemp(join(tmpdir(),'vf-audio-api-')),port=17873,url=`http://127.0.0.1:${port}`,wait=ms=>new Promise(r=>setTimeout(r,ms));
const app=spawn(resolve('artifacts/win-x64/VtuberFriends.exe'),['--demo','--port',String(port),'--data-dir',data],{windowsHide:true,stdio:'ignore',env:{...process.env,VF_DISCORD_BOT_TOKEN:''}});
try{
 let ready=false;for(let i=0;i<100;i++){try{await fetch(url+'/api/state');ready=true;break;}catch{await wait(100);}}assert(ready);
 for(const headers of [{},{'X-VF-Panel':'1',Origin:'https://untrusted.invalid'}])assert.equal((await fetch(url+'/api/audio/reconnect',{method:'POST',headers})).status,403);
 assert.equal((await fetch(url+'/api/audio/reconnect',{method:'POST',headers:{'X-VF-Panel':'1'}})).status,400);
 const html=await(await fetch(url+'/')).text();assert.match(html,/data-reconnect/);assert.match(html,/audioHealthSummary/);
 await fetch(url+'/api/app/exit',{method:'POST',headers:{'X-VF-Panel':'1'}});await Promise.race([new Promise(r=>app.once('exit',r)),wait(5000)]);assert.equal(app.exitCode,0);
 console.log('PASS: manual audio reconnect API rejects missing panel header, foreign origin and demo; controls served and clean exit. No credentials/network Discord.');
}finally{if(app.exitCode===null)app.kill();}
