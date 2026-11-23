import {propShader} from '../src/VtuberFriends/wwwroot/puppet/prop-effects.js';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../src/VtuberFriends/wwwroot/puppet/renderer.js',import.meta.url),'utf8');
function check(text){
 text=text.replace('${propShader}',propShader);
 const vertex=text.match(/const vertexSource=`([\s\S]*?)`;/)[1],fragment=text.match(/const fragmentSource=`([\s\S]*?)`;/)[1];
 function declarations(shader,stage){
  const defaultFloat=shader.match(/precision\s+(lowp|mediump|highp)\s+float\s*;/)?.[1]||(stage==='vertex'?'highp':null);
  const found=new Map();
  for(const match of shader.matchAll(/\b(uniform|varying)\s+(?:(lowp|mediump|highp)\s+)?(float|vec[234]|mat[234])\s+(\w+)(\[\d+\])?\s*;/g))found.set(match[4],{kind:match[1],precision:match[2]||defaultFloat,type:match[3],array:match[5]||''});
  return found;
 }
 const a=declarations(vertex,'vertex'),b=declarations(fragment,'fragment');
 for(const shader of [vertex,fragment])for(const name of new Set(shader.match(/\bu[A-Z]\w*\b/g)))assert.match(shader,new RegExp('\\buniform\\s+(?:(?:lowp|mediump|highp)\\s+)?\\w+\\s+'+name+'(?:\\[|\\s*;)'),'Undeclared uniform '+name);
 for(const [name,definition]of a)if(b.has(name))assert.deepEqual(definition,b.get(name),'Shader stages disagree on '+name);
 for(const [name,definition]of b)if(definition.kind==='varying')assert(a.has(name),'Fragment varying missing from vertex: '+name);
}
check(source);
assert.throws(()=>check(source.replaceAll('uniform mediump float uSurfaceSmile;','')),/uSurfaceSmile/);
const mediumSource=source.replace(/#ifdef GL_FRAGMENT_PRECISION_HIGH[\s\S]*?#endif/g,'precision mediump float;');
check(mediumSource);
// Original regression: implicit highp in vertex, implicit mediump in fragment.
assert.throws(()=>check(mediumSource.replaceAll('uniform mediump float uOpen;','uniform float uOpen;')),/uOpen/);
console.log('PASS: matching shared uniform/varying precision and types; original uOpen regression rejected. Static interface validation, not GPU compilation.');
