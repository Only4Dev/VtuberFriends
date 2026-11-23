import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {AvatarBehaviorController,P,ParameterNames} from '../src/VtuberFriends/wwwroot/puppet/controllers.js';
import {PuppetRig,pivotMatrix} from '../src/VtuberFriends/wwwroot/puppet/rig.js';
const input={rms:0,thresholdDb:-60,idle:.55,wings:.5,mouthGain:1,headRange:17,expression:'neutral',manual:false};
const behavior=new AvatarBehaviorController(47);
for(let i=0;i<60;i++)behavior.update(1/60,input);
input.rms=.012;
const first=behavior.update(1/60,input)[P.MouthOpen];
assert(first>0&&first<.85,'Mouth must start continuously, not jump open');
for(let i=0;i<60;i++)behavior.update(1/60,input);
assert(behavior.values[P.MouthOpen]>.5&&behavior.values[P.MouthOpen]<=1);
input.rms=0;for(let i=0;i<120;i++)behavior.update(1/60,input);
assert(behavior.values[P.MouthOpen]<.005,'Release must settle to silence');
let blinkSeen=false,leftMoved=false,rightMoved=false,headMoved=false;
for(let i=0;i<9000;i++){
 input.rms=i%190<65?.007:0;
 const pose=behavior.update(1/60,input);
 assert(pose.every(Number.isFinite));
 assert(Math.abs(pose[P.HeadAngleX])<=17.001&&Math.abs(pose[P.HeadAngleY])<=17.001);
 assert(pose[P.MouthOpen]>=0&&pose[P.MouthOpen]<=1);
 if(pose[P.EyeOpenLeft]<.2)blinkSeen=true;
 if(Math.abs(pose[P.WingLeftTip])>.2)leftMoved=true;
 if(Math.abs(pose[P.WingRightTip])>.2)rightMoved=true;
 if(Math.abs(pose[P.HeadAngleX])>1)headMoved=true;
}
assert(blinkSeen&&leftMoved&&rightMoved&&headMoved,'Autonomous channels must remain alive');
const a=new AvatarBehaviorController(3),b=new AvatarBehaviorController(3);
const speech={...input,rms:.01,expression:'neutral',idle:0,wings:0};
for(let i=0;i<30;i++)a.update(1/30,speech);
for(let i=0;i<60;i++)b.update(1/60,speech);
assert(Math.abs(a.values[P.MouthOpen]-b.values[P.MouthOpen])<.01,'Lip sync must be dt-based');
behavior.setOverride('HeadAngleX',100);behavior.setOverride('EyeLookX',.7);input.headRange=20;
for(let i=0;i<120;i++)behavior.update(1/60,input);
assert(behavior.values[P.HeadAngleX]<=20.001&&behavior.values[P.HeadAngleX]>19.8);
assert(Math.abs(behavior.values[P.EyeLookX]-.7)<.001);
behavior.setOverride('JawOffset',.3);behavior.setOverride('Blink',1);
for(let i=0;i<120;i++)behavior.update(1/60,input);
assert(Math.abs(behavior.values[P.JawOffset]-.3)<.001);
assert(behavior.values[P.EyeOpenLeft]<.04&&behavior.values[P.EyeOpenRight]<.04);
behavior.clearOverride();
const path=new URL('../src/VtuberFriends/wwwroot/puppets/cyan-dragon/rig.json',import.meta.url);
const manifest=JSON.parse(await readFile(path,'utf8')),rig=new PuppetRig(manifest);
rig.update(behavior.values);
assert.equal(rig.parts.length,18);assert.equal(ParameterNames.length,23);
for(const part of rig.parts){
 if(part.definition.kind==='solid')continue;
 const data=await readFile(new URL('../src/VtuberFriends/wwwroot/puppets/cyan-dragon/'+part.definition.src,import.meta.url));
 assert.equal(data.subarray(1,4).toString(),'PNG');
 assert(part.matrix.every(Number.isFinite));
}
assert.notEqual(rig.parts.find(p=>p.definition.id==='wing-left').warp[2],0);
const invalid=structuredClone(manifest);invalid.parts[0].src='../reference.png';
assert.throws(()=>new PuppetRig(invalid));
const missing=structuredClone(manifest);missing.parts.pop();assert.throws(()=>new PuppetRig(missing));
const matrix=new Float32Array(9);pivotMatrix(matrix,10,10,Math.PI/2);
assert(Math.abs(matrix[0]*20+matrix[3]*10+matrix[6]-10)<.0001);
assert(Math.abs(matrix[1]*20+matrix[4]*10+matrix[7]-20)<.0001);
console.log('PASS: continuous mouth attack/release and dt, autonomous blink/gaze/head/wings, bounds/overrides, 14 PNG layers and four solid layers, hierarchy, pivots and manifest rejection.');

const pose=new Float32Array(ParameterNames.length);pose[P.MouthWidth]=1;pose[P.EyeOpenLeft]=pose[P.EyeOpenRight]=1;rig.update(pose);
const eyeScale=rig.nodes.get('eye-left').local[4],lidY=rig.nodes.get('lid-left-upper').local[7];
pose[P.EyeOpenLeft]=0;rig.update(pose);
assert.equal(rig.nodes.get('eye-left').local[4],eyeScale,'Blink must not squash white eyes');
assert(rig.nodes.get('lid-left-upper').local[7]>lidY+100,'Upper eyelid must move down like a curtain');
assert(manifest.parts.findIndex(p=>p.id==='eye-left')<manifest.parts.findIndex(p=>p.id==='head'));
assert.equal(manifest.parts.find(p=>p.id==='head').src,'head-v4.png');

// Separate teeth follow the same head-space upper lip transform.
assert(manifest.parts.some(p=>p.id==='fangs'&&p.src==='fangs.png'));
assert.equal(manifest.mouthRig.count,2);
const order=id=>manifest.parts.findIndex(p=>p.id===id);
assert(order('mouth')<order('jaw')&&order('jaw')<order('head'));
pose[P.MouthOpen]=pose[P.JawOffset]=0;rig.update(pose);
const closedHead=Array.from(rig.nodes.get('head').world);
assert.equal(rig.parts.find(p=>p.definition.id==='mouth').alpha,0);
for(const openness of [.2,.5,1]){
 pose[P.MouthOpen]=pose[P.JawOffset]=openness;rig.update(pose);
 assert.deepEqual(Array.from(rig.nodes.get('head').world),closedHead,'Speech cannot detach upper teeth from lip');
 assert.equal(rig.nodes.get('mouth').local[7],0,'Cavity must remain registered to head');
 assert.deepEqual(Array.from(rig.nodes.get('upper-fangs').world),closedHead,'Fangs must inherit the head and upper lip transform');
 assert(Math.abs(rig.parts.find(p=>p.definition.id==='jaw').warp[2]-openness)<.00001);
}
console.log('PASS: upper teeth attached, hidden cavity in silence, anchored opening, jaw mesh and mouth occlusion order.');

const quick=new AvatarBehaviorController(9),mic={...input,idle:0,wings:0,expression:'neutral',rms:.003};
for(let i=0;i<3;i++)quick.update(1/60,mic);
assert(quick.values[P.MouthOpen]>.55,'Voice must open mouth within 50ms');
mic.rms=0;for(let i=0;i<9;i++)quick.update(1/60,mic);
assert(quick.values[P.MouthOpen]<.06,'Mouth must close within 150ms of silence');
const cavity=manifest.parts.find(p=>p.id==='mouth');
assert.equal(cavity.kind,'solid');assert.deepEqual(cavity.color,[20,13,21,255]);assert(cavity.clipMouth);
assert(manifest.parts.find(p=>p.id==='tongue').clipMouth);
assert(manifest.textureMax>=2048);
console.log('PASS: 50ms attack / 150ms release, separate two-fang layer, black clipped cavity and tongue, high-resolution textures.');

const neutralRig=new PuppetRig(manifest);neutralRig.update(pose);
const before=Array.from(neutralRig.parts.find(p=>p.definition.id==='jaw').matrix);
neutralRig.update(pose,{parts:{jaw:{x:23,y:-14,scaleX:1,scaleY:1,rotation:0}},mouthTravel:60,padding:300});
const after=neutralRig.parts.find(p=>p.definition.id==='jaw').matrix;
assert(Math.abs(after[6]-before[6]-23)<.001&&Math.abs(after[7]-before[7]+14)<.001,'Saved piece translation must reach rig');
assert.equal(neutralRig.settings.mouthTravel,60);
console.log('PASS: per-piece editor transforms and renderer settings.');

// Four repeated words, with nonzero troughs that used to saturate above the fixed gate.
const syllables=new AvatarBehaviorController(14);
const voiced={...input,thresholdDb:-80,rms:0,idle:0,wings:0,expression:'neutral'};
let rises=0,wasOpen=false;
for(let word=0;word<4;word++){
 voiced.rms=.025;
 for(let i=0;i<12;i++){const open=syllables.update(1/60,voiced)[P.MouthOpen];if(open>.6&&!wasOpen){rises++;wasOpen=true;}}
 assert(syllables.values[P.MouthOpen]>.8);
 voiced.rms=.003; // still 30x the absolute threshold; must nevertheless articulate a valley
 for(let i=0;i<10;i++)syllables.update(1/60,voiced);
 assert(syllables.values[P.MouthOpen]<.08,'Between words the mouth must close despite residual audio');wasOpen=false;
}
assert.equal(rises,4);
voiced.rms=.02;for(let i=0;i<90;i++)syllables.update(1/60,voiced);
assert(syllables.values[P.MouthOpen]>.8,'A sustained vowel must not invent repeated closures');
console.log('PASS: four word envelopes produce four openings with residual sound; sustained vowel remains sustained. Not phoneme recognition.');

const backing=manifest.parts.find(p=>p.id==='mouth-back');
assert.equal(backing.color[3],255);assert.equal(backing.editReference,'mouth');assert(order('mouth-back')>order('torso')&&order('mouth-back')<order('tongue'));
for(const openness of [0,.03,.2,.5,1]){
 pose[P.MouthOpen]=pose[P.JawOffset]=openness;neutralRig.update(pose);
 assert.equal(neutralRig.parts.find(p=>p.definition.id==='mouth-back').alpha,1,'Backing must stay opaque even while cavity fades');
}
const custom={parts:{jaw:{x:12,y:-7,scaleX:1.1,scaleY:.9,rotation:4}}};neutralRig.update(pose,custom);
assert.deepEqual(Array.from(neutralRig.parts.find(p=>p.definition.id==='lower-teeth').matrix),Array.from(neutralRig.parts.find(p=>p.definition.id==='jaw').matrix),'Lower teeth must share jaw edits and pivot');
assert(order('tongue')<order('lower-teeth')&&order('lower-teeth')<order('jaw'));
console.log('PASS: permanently opaque backing behind mouth; independent lower teeth inherit jaw edits and occlusion.');

const stable=new AvatarBehaviorController(16),vowel={...input,idle:0,wings:0,expression:'neutral',mouthStability:.7,rms:.02};
let vowelMin=1,vowelMax=0;
for(let i=0;i<240;i++){vowel.rms=.02*(1+.04*Math.sin(i*1.7));const value=stable.update(1/60,vowel)[P.MouthOpen];if(i>60){vowelMin=Math.min(vowelMin,value);vowelMax=Math.max(vowelMax,value);}}
assert(vowelMax-vowelMin<.025,'Small sustained-vowel variations should not shake the mouth');
const fixed=new AvatarBehaviorController(17),fixedInput={...vowel,mouthMode:'fixed',thresholdDb:-55,mouthMaxDb:-25};
for(const [db,expectedMin,expectedMax]of [[-60,0,.005],[-40,.5,.7],[-25,.99,1.001]]){
 fixedInput.rms=10**(db/20);for(let i=0;i<60;i++)fixed.update(1/60,fixedInput);
 assert(fixed.values[P.MouthOpen]>=expectedMin&&fixed.values[P.MouthOpen]<=expectedMax,'Fixed dB range at '+db);
}
console.log('PASS: sustained vowel stability and explicit dB minimum / midpoint / maximum.');

const gestures=new AvatarBehaviorController(82),gestureInput={...input,idle:.55,headRange:15,rms:0,expression:'neutral',manual:false};
let minTilt=0,maxTilt=0,centerSeen=false,maxGazeX=0,maxGazeY=0,maxStep=0,previousTilt=0;
for(let i=0;i<3600;i++){
 const v=gestures.update(1/60,gestureInput),tilt=v[P.HeadAngleZ];
 minTilt=Math.min(minTilt,tilt);maxTilt=Math.max(maxTilt,tilt);
 maxStep=Math.max(maxStep,Math.abs(tilt-previousTilt));previousTilt=tilt;
 if(i>180&&Math.abs(tilt)<.5)centerSeen=true;
 maxGazeX=Math.max(maxGazeX,Math.abs(v[P.EyeLookX]));maxGazeY=Math.max(maxGazeY,Math.abs(v[P.EyeLookY]));
}
assert(minTilt<-7&&maxTilt>7&&centerSeen,'Default spontaneous gestures must clearly tilt both sides and return to center');
assert(maxStep<1,'Head motion must interpolate smoothly');
assert(maxGazeX>.2&&maxGazeY>.15,'Automatic eyes must still glance away from center');
pose.fill(0);pose[P.MouthWidth]=1;pose[P.EyeLookX]=1;pose[P.EyeLookY]=1;neutralRig.update(pose);
assert.equal(neutralRig.nodes.get('eye-left').local[6],24);assert.equal(neutralRig.nodes.get('eye-left').local[7],17);
console.log('PASS: pronounced two-sided gestures, center return, smooth interpolation and expanded gaze.');

const calm=new AvatarBehaviorController(59);let frontal=0,extreme=0,samples=0;
for(let i=0;i<10800;i++){
 const v=calm.update(1/60,gestureInput);if(i<120)continue;samples++;
 if(Math.abs(v[P.EyeLookX])<.1&&Math.abs(v[P.EyeLookY])<.1)frontal++;
 if(Math.abs(v[P.EyeLookX])>.75||Math.abs(v[P.EyeLookY])>.75)extreme++;
}
assert(frontal/samples>.65,'Eyes should face front most of the time');
assert(extreme/samples<.08,'Extreme glances must be rare');
console.log('PASS: front-facing gaze majority and rare extremes.');
