import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {jadeShinyColor,useJadeShiny} from '../src/VtuberFriends/wwwroot/puppet/jade-palette.js';
import {PuppetRig} from '../src/VtuberFriends/wwwroot/puppet/rig.js';
import {P,ParameterNames} from '../src/VtuberFriends/wwwroot/puppet/controllers.js';
import {fitRigView} from '../src/VtuberFriends/wwwroot/puppet/framing.js';
const directory=new URL('../src/VtuberFriends/wwwroot/puppets/jade-dragon/',import.meta.url);
const hashes=JSON.parse(await readFile(new URL('./fixtures/jade-art-hashes-v1.json',import.meta.url),'utf8'));
for(const [file,expected]of Object.entries(hashes))assert.equal(createHash('sha256').update(await readFile(new URL(file,directory))).digest('hex'),expected,'Original art or rig changed: '+file);
for(const rgb of [[1,.75,.1],[.8,.08,.12],[.95,.95,.95],[.3,.3,.3],[1,.6,.05]])assert.deepEqual(jadeShinyColor(rgb),rgb,'Preserve gold/red/silver/iris');
for(const rgb of [[.08,.6,.3],[.04,.18,.1],[.5,.8,.6]]){
 const shiny=jadeShinyColor(rgb);assert(shiny.every(n=>n>=0&&n<=1));assert(shiny[1]<rgb[1]*.6);assert(Math.max(...shiny)-Math.min(...shiny)<.025,'Green becomes charcoal, not another saturated color');
}
const m=JSON.parse(await readFile(new URL('rig.json',directory),'utf8')),rig=new PuppetRig(m),pose=new Float32Array(ParameterNames.length);pose[P.MouthWidth]=pose[P.EyeOpenLeft]=pose[P.EyeOpenRight]=1;pose[P.HeadAngleZ]=7;pose[P.MouthOpen]=.6;
const snapshot=()=>({box:Array.from(fitRigView(rig)),parts:rig.parts.map(p=>({matrix:Array.from(p.matrix),warp:Array.from(p.warp),alpha:p.alpha}))});
rig.update(pose,{padding:120,jadeShiny:false});const before=snapshot();rig.update(pose,{padding:120,jadeShiny:true});assert.deepEqual(snapshot(),before,'Recolor must not change any transforms, alpha, camera or mouth');
assert(useJadeShiny(rig,m.parts.find(p=>p.id==='head')));assert(!useJadeShiny(rig,{accessory:{},src:'test.png'}));assert(!useJadeShiny(rig,{kind:'solid'}));assert(!useJadeShiny(rig,{src:'test.png'},2));assert(!useJadeShiny({manifest:{id:'cyan-dragon'},settings:{jadeShiny:true}},{src:'test.png'}));
console.log('PASS: exact original Jade rig/PNG hashes, identical geometry/alpha/camera, green-to-charcoal palette, preserved gold/red/eyes and no accessory/other-model recolor.');
