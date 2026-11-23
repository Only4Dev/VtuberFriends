import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {ambientRegistry,ambientPool,paintAmbient} from '../src/VtuberFriends/wwwroot/vfx/ambient.js';
const require=createRequire(import.meta.url),{createCanvas}=require('../.tools/vfx-preview/node_modules/@napi-rs/canvas');
const sheet=createCanvas(1200,660),ctx=sheet.getContext('2d');ctx.fillStyle='#0e151b';ctx.fillRect(0,0,1200,660);
const anchors={center:{x:200,y:150},body:{x:200,y:210},radius:90,hornLeft:{x:155,y:75},hornRight:{x:245,y:75}};
const modes=[...Object.entries(ambientRegistry),['all','Combinados']];
for(let i=0;i<modes.length;i++){
 const [id,label]=modes[i],back=createCanvas(800,600),front=createCanvas(800,600),a=back.getContext('2d'),b=front.getContext('2d');a.scale(2,2);b.scale(2,2);
 paintAmbient(a,b,id==='all'?.2:3,anchors,{effects:id==='all'?Object.keys(ambientRegistry):[id],color:'#86d8ef',quality:'high',intensity:.85,size:1},ambientPool());
 const x=(i%3)*400,y=Math.floor(i/3)*330;ctx.drawImage(back,x,y+30,400,300);ctx.drawImage(front,x,y+30,400,300);ctx.fillStyle='#d7e2e5';ctx.font='14px sans-serif';ctx.fillText(label,x+14,y+22);
}
await mkdir('artifacts/vfx',{recursive:true});await writeFile('artifacts/vfx/ambient-contact-sheet.png',sheet.toBuffer('image/png'));console.log('Rendered actual Canvas2D ornaments (effects only).');
