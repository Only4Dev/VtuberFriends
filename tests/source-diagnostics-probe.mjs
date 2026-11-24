import assert from 'node:assert/strict';
const {monitorSource}=await import('../src/VtuberFriends/wwwroot/source-diagnostics.js');let now=1000,periodic,initial;const target=new EventTarget(),root=new EventTarget(),sent=[];
monitorSource(4,{send:async(u,o)=>{sent.push(JSON.parse(o.body));return {ok:true};},clock:()=>now,target,root,read:()=>({frameAgeMs:90,fresh:true,token:'SECRET'}),every:(f,ms)=>{assert.equal(ms,60000);periodic=f;},later:(f,ms)=>{assert.equal(ms,1000);initial=f;}});
assert.equal(sent.length,0);initial();assert.equal(sent.length,1);for(let i=0;i<100;i++)target.dispatchEvent(new Event('error'));assert.equal(sent.filter(s=>s.event==='js_error').length,1);
root.dispatchEvent(new Event('webglcontextlost'));assert(sent.at(-1).contextLost);root.dispatchEvent(new Event('webglcontextrestored'));assert.equal(sent.at(-1).contextLost,false);now+=60000;periodic();assert.equal(sent.filter(s=>s.event==='heartbeat').length,2);assert(!JSON.stringify(sent).includes('SECRET'));
console.log('PASS: independent renderer diagnostics, one heartbeat/minute, JS-error throttling, WebGL lost/restored and fixed safe payload. No real browser.');
