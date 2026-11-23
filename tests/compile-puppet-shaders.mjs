import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {propShader} from '../src/VtuberFriends/wwwroot/puppet/prop-effects.js';
const source=await readFile(new URL('../src/VtuberFriends/wwwroot/puppet/renderer.js',import.meta.url),'utf8');
const out=new URL('../.tools/shader-check/',import.meta.url);await mkdir(out,{recursive:true});
const compiler=process.argv[2]||new URL('compiler/bin/glslangValidator.exe',out).pathname.replace(/^\/(\w:)/,'$1');
for(const precision of ['highp','mediump']){
 const files=[];for(const [stage,ext]of [['vertex','vert'],['fragment','frag']]){
  let text=source.match(new RegExp('const '+stage+'Source=`([\\s\\S]*?)`;'))[1].replace('${propShader}',propShader);
  if(precision==='mediump')text=text.replace(/#ifdef GL_FRAGMENT_PRECISION_HIGH[\s\S]*?#endif/g,'precision mediump float;');
  const file=new URL('puppet-'+precision+'.'+ext,out);await writeFile(file,'#version 100\n'+text);files.push(file.pathname.replace(/^\/(\w:)/,'$1'));
 }
 const result=spawnSync(compiler,['-l',...files],{encoding:'utf8'});if(result.error)throw result.error;if(result.status!==0)throw Error(result.stdout+result.stderr);
}
console.log('PASS: GLSL ES 1.00 vertex/fragment compile and link with glslang, highp and mediump. Not a Streamlabs GPU/visual test.');
