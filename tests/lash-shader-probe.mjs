import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {lashOffset} from '../src/VtuberFriends/wwwroot/puppet/lash-contour.js';
const source=await readFile(new URL('../src/VtuberFriends/wwwroot/puppet/renderer.js',import.meta.url),'utf8');
const block=source.match(/if\(uLashFit>\.5\)\{([\s\S]*?)\n \}/)[1];
// Execute this arithmetic directly from the vertex shader, not a rewritten interpolation.
function evaluate(block,u,offsets){
 const js=block.replace(/\bfloat\s+/g,'let ').replace(/\bint\s+/g,'let ').replace(/\bfloat\(/g,'Number(');
 return Function('u','uLashOffsets','mix','clamp','const aPoint={x:u},p={y:0};'+js+';return p.y;')(u,offsets,(a,b,t)=>a+(b-a)*t,(v,a,b)=>Math.max(a,Math.min(b,v)));
}
const manifest=JSON.parse(await readFile(new URL('../src/VtuberFriends/wwwroot/puppets/rose-dragon/rig.json',import.meta.url),'utf8'));
const sets=[...manifest.parts.filter(p=>p.lashOffsets).map(p=>p.lashOffsets),[1,3,-4,9,2,-8,6,4,12]];
function check(block){for(const offsets of sets)for(const segments of [8,24,32])for(let i=0;i<=segments;i++){
 const u=i/segments;assert(Math.abs(evaluate(block,u,offsets)-lashOffset({lashOffsets:offsets},u))<1e-9,'Shader added lash offset twice at mesh column '+i+'/'+segments);
}}
check(block);
assert.throws(()=>check(block.replace('offset=mix','offset+=mix')),/twice/);
console.log('PASS: actual lash vertex-shader arithmetic matches CPU at every mesh column, including shared interval boundaries; double-add regression rejected. Not a GPU render test.');
