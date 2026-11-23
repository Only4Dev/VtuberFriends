import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {cinematicPresets,sceneState,sceneResources,paintScene,prepareCloud} from '../src/VtuberFriends/wwwroot/vfx/cinematic.js';
const require=createRequire(import.meta.url),{createCanvas}=require('../.tools/vfx-preview/node_modules/@napi-rs/canvas');
const sheet=createCanvas(1600,990),ctx=sheet.getContext('2d');ctx.fillStyle='#0d1218';ctx.fillRect(0,0,1600,990);
let row=0;
for(const kind of Object.keys(cinematicPresets)){
 let col=0;
 for(const t of [.22,.4,.58,.76]){
  const back=createCanvas(800,600),front=createCanvas(800,600),a=back.getContext('2d'),b=front.getContext('2d');a.scale(2,2);b.scale(2,2);
  const res=sceneResources(cinematicPresets[kind].seed,'high');if(kind==='tempest')prepareCloud(res,createCanvas(160,160));
  paintScene(kind,a,b,sceneState(kind,t),res,false,.9);
  const x=col*400,y=row*330;ctx.drawImage(back,x,y+30,400,300);ctx.drawImage(front,x,y+30,400,300);
  ctx.fillStyle='#d7d9d1';ctx.font='14px sans-serif';ctx.fillText(kind+' · '+Math.round(t*100)+'%',x+14,y+22);col++;
 }
 row++;
}
await mkdir('artifacts/vfx',{recursive:true});await writeFile('artifacts/vfx/contact-sheet.png',sheet.toBuffer('image/png'));
console.log('Rendered actual Canvas2D VFX frames to artifacts/vfx/contact-sheet.png (effects only; not Streamlabs/GPU).');
