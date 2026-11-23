export const ParameterNames=[
 'HeadAngleX','HeadAngleY','HeadAngleZ','HeadPositionX','HeadPositionY',
 'EyeLookX','EyeLookY','EyeOpenLeft','EyeOpenRight','Blink','EyeExpression',
 'MouthOpen','MouthForm','MouthWidth','JawOffset','Breath',
 'WingLeftRoot','WingLeftTip','WingRightRoot','WingRightTip','WingLeftFlex','WingRightFlex','NeckCompensation'
];
export const P=Object.freeze(Object.fromEntries(ParameterNames.map((name,index)=>[name,index])));
export const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export const smooth=(value,target,dt,seconds)=>value+(target-value)*(1-Math.exp(-dt/Math.max(.001,seconds)));
export class AnimationBlendController{
 constructor(){this.values=new Float32Array(ParameterNames.length);this.priorities=new Uint8Array(ParameterNames.length);}
 reset(){this.values.fill(0);this.priorities.fill(0);this.values[P.EyeOpenLeft]=this.values[P.EyeOpenRight]=1;this.values[P.MouthWidth]=1;}
 write(parameter,value,priority){if(Number.isFinite(value)&&priority>=this.priorities[parameter]){this.values[parameter]=value;this.priorities[parameter]=priority;}}
}
export const idleGestures=Object.freeze({
 tilt:[[0,0,0],[.35,-.12,1],[0,0,0],[-.25,.08,-.85],[0,0,0]],
 sweep:[[0,0,0],[1,.08,.8],[-1,-.12,-.9],[0,0,0]],
 curious:[[0,0,0],[-.65,-.6,-1],[-.65,-.6,-1],[.4,.25,.65],[0,0,0]],
 nod:[[0,0,0],[.3,.8,.75],[-.3,-.6,-.75],[0,0,0]]
});
export class ProceduralIdleController{
 constructor(random){this.random=random;this.time=0;this.nextGesture=.6;this.gestureAt=-100;this.gestureDuration=4;this.gestureName='tilt';this.gestureSide=1;this.nextStretch=6;this.stretch=0;this.stretchSide=1;}
 update(dt,blend,input){
  this.time+=dt;const t=this.time,intensity=clamp(input.idle??.55,0,1);
  if(t>this.nextGesture){
   const names=Object.keys(idleGestures);this.gestureName=names[Math.floor(this.random()*names.length)];
   this.gestureSide=this.random()<.5?-1:1;this.gestureAt=t;this.gestureDuration=3.8+this.random()*1.8;
   this.nextGesture=t+this.gestureDuration+1.8+this.random()*2;
  }
  if(t>this.nextStretch){this.nextStretch=t+8+this.random()*13;this.stretch=1;this.stretchSide=this.random()<.5?-1:1;}
  this.stretch=smooth(this.stretch,0,dt,1.8);
  const keys=idleGestures[this.gestureName],progress=clamp((t-this.gestureAt)/this.gestureDuration,0,1)*(keys.length-1);
  const index=Math.min(keys.length-2,Math.floor(progress)),fraction=progress-index,ease=fraction*fraction*(3-2*fraction);
  const x=keys[index][0]+(keys[index+1][0]-keys[index][0])*ease;
  const y=keys[index][1]+(keys[index+1][1]-keys[index][1])*ease;
  const z=keys[index][2]+(keys[index+1][2]-keys[index][2])*ease;
  const range=clamp(input.headRange??15,0,20),strength=Math.sqrt(intensity)*.85;
  blend.write(P.HeadAngleX,(x*.95*this.gestureSide*strength+Math.sin(t*.31)*.035*intensity)*range,5);
  blend.write(P.HeadAngleY,(y*.8*strength+Math.sin(t*.43+.7)*.035*intensity)*range,5);
  blend.write(P.HeadAngleZ,(z*this.gestureSide*strength+Math.sin(t*.65)*.035*intensity)*Math.min(15,range),5);
  blend.write(P.HeadPositionX,Math.sin(t*.27)*3*intensity,5);
  blend.write(P.HeadPositionY,Math.sin(t*.7)*3*intensity,5);
  blend.write(P.Breath,(.5+.5*Math.sin(t*1.32)+.08*Math.sin(t*.37))*intensity,5);
 }
}
export class EyeController{
 constructor(random){this.random=random;this.time=0;this.nextBlink=1+random()*3;this.blinkAt=-10;this.nextLook=2.5;this.x=0;this.y=0;this.targetX=0;this.targetY=0;}
 update(dt,blend,input){
  this.time+=dt;
  if(this.time>this.nextBlink){this.blinkAt=this.time;this.nextBlink=this.time+2.4+this.random()*4.5;}
  if(this.time>this.nextLook){
   if(this.targetX!==0||this.targetY!==0){
    this.targetX=0;this.targetY=0;this.nextLook=this.time+2.8+this.random()*3.2;
   }else{
    const extreme=this.random()<.10,horizontal=this.random()<.75;
    this.targetX=(this.random()<.5?-1:1)*(extreme?.8+this.random()*.2:horizontal?.2+this.random()*.35:this.random()*.16);
    this.targetY=(this.random()<.5?-1:1)*(extreme?.7+this.random()*.3:horizontal?this.random()*.18:.15+this.random()*.25);
    this.nextLook=this.time+.65+this.random()*.7;
   }
  }
  this.x=smooth(this.x,this.targetX,dt,.065);this.y=smooth(this.y,this.targetY,dt,.07);
  const age=this.time-this.blinkAt;
  const blink=age>=0&&age<.19?Math.sin(Math.PI*age/.19):0;
  blend.write(P.EyeLookX,this.x,10);blend.write(P.EyeLookY,this.y,10);
  blend.write(P.Blink,blink,10);blend.write(P.EyeOpenLeft,Math.max(.025,1-blink),10);blend.write(P.EyeOpenRight,Math.max(.025,1-blink*.98),10);
 }
}
export class MouthController{
 constructor(){this.open=0;this.voicePeak=0;this.desired=0;}
 update(dt,blend,input){
  const threshold=Math.pow(10,clamp(input.thresholdDb??-60,-80,-20)/20);
  const rms=Math.max(0,Number.isFinite(input.rms)?input.rms:0);
  // Track actual voice dynamics; a low noise gate must not flatten every syllable to 1.
  this.voicePeak=Math.max(rms,this.voicePeak*Math.exp(-dt/1.5),threshold*4);
  const floor=Math.max(threshold,this.voicePeak*.30);
  const stability=clamp(input.mouthStability??.5,0,1);
  let relative=clamp((rms-floor)/Math.max(threshold,this.voicePeak-floor),0,1);
  let full=.92;
  if(input.mouthMode==='fixed'){
   const minDb=clamp(input.thresholdDb??-60,-80,-20),maxDb=Math.max(minDb+3,input.mouthMaxDb??-25);
   relative=clamp(((rms>0?20*Math.log10(rms):-120)-minDb)/(maxDb-minDb),0,1);full=1;
  }else relative=clamp(relative/(1-.45*stability),0,1);
  const raw=clamp(Math.pow(relative,.8)*full*(input.mouthGain??1),0,1);
  // Hysteresis suppresses tiny level fluctuations without delaying a true syllable valley.
  if(raw===0||raw===1||Math.abs(raw-this.desired)>.015+.1*stability)this.desired=raw;
  const target=this.desired;
  this.open=smooth(this.open,target,dt,target > this.open ? .012 : .045);
  if(this.open<.001)this.open=0;
  blend.write(P.MouthOpen,this.open,this.open>.025?50:15);
  blend.write(P.JawOffset,this.open,50);
 }
}
export class WingController{
 update(dt,blend,input,idle,mouth){
  const t=idle.time,amount=clamp(input.wings??.5,0,1)*.9,stretch=idle.stretch*amount,flap=Math.sin(t*3.8)*(.5+.5*Math.sin(t*.23));
  const breath=Math.sin(t*1.32)*.5;
  blend.write(P.WingLeftRoot,(Math.sin(t*.67)*7+flap*9+breath+mouth.open*2+(idle.stretchSide<0?stretch*4:0))*amount,10);
  blend.write(P.WingRightRoot,(-Math.sin(t*.71+.42)*6.5+flap*9-breath-mouth.open*1.8-(idle.stretchSide>0?stretch*4:0))*amount,10);
  blend.write(P.WingLeftTip,(Math.sin(t*.83+.7)*10+flap*8+mouth.open*2+stretch*3)*amount,10);
  blend.write(P.WingRightTip,(-Math.sin(t*.79+1.1)*10+flap*8-mouth.open*1.8-stretch*2.6)*amount,10);
  blend.write(P.WingLeftFlex,Math.sin(t*.92)*1.5*amount,10);
  blend.write(P.WingRightFlex,Math.sin(t*.87+.8)*1.4*amount,10);
 }
}
export class FacialController{
 constructor(random){this.random=random;this.time=0;this.nextGesture=8+random()*8;this.autoExpression='neutral';this.until=0;}
 update(dt,blend,input,mouth){
  this.time+=dt;
  if(this.time>this.nextGesture){this.nextGesture=this.time+12+this.random()*20;this.autoExpression=mouth.open>.1?'happy':this.random()<.65?'curious':'yawn';this.until=this.time+1.4+this.random();}
  const expression=input.expression&&input.expression!=='auto'?input.expression:this.time<this.until?this.autoExpression:'neutral';
  this.expression=expression;
  if(expression==='surprised'){blend.write(P.WingLeftRoot,4,30);blend.write(P.WingRightRoot,-4,30);blend.write(P.WingLeftTip,7,30);blend.write(P.WingRightTip,-7,30);blend.write(P.EyeOpenLeft,1,30);blend.write(P.EyeOpenRight,1,30);blend.write(P.MouthOpen,.36,30);blend.write(P.HeadAngleY,-5,30);blend.write(P.EyeExpression,1,30);}
  if(expression==='angry'){blend.write(P.EyeOpenLeft,.58,30);blend.write(P.EyeOpenRight,.58,30);blend.write(P.MouthForm,-.4,30);blend.write(P.HeadAngleY,3,30);blend.write(P.EyeExpression,-1,30);}
  if(expression==='happy'){blend.write(P.EyeOpenLeft,.73,30);blend.write(P.EyeOpenRight,.73,30);blend.write(P.MouthForm,.65,30);}
  if(expression==='curious'){blend.write(P.HeadAngleZ,9.5,30);blend.write(P.HeadAngleX,-9,30);blend.write(P.EyeLookX,.85,30);}
  if(expression==='yawn'&&mouth.open<.025){blend.write(P.MouthOpen,.8,30);blend.write(P.EyeOpenLeft,.3,30);blend.write(P.EyeOpenRight,.3,30);blend.write(P.HeadAngleY,-4,30);}
  // A real blink has precedence over an expression; speech beats yawn/surprise.
  const blink=blend.values[P.Blink];
  if(blink>.1){blend.write(P.EyeOpenLeft,Math.max(.025,1-blink),40);blend.write(P.EyeOpenRight,Math.max(.025,1-blink),40);}
 }
}
export class AvatarBehaviorController{
 setOverride(name,value){
  const index=P[name];if(index===undefined||!Number.isFinite(value))throw Error('Parámetro de Puppet inválido.');
  const limit=name.startsWith('HeadAngle')?20:name.startsWith('HeadPosition')?12:name==='MouthWidth'?1.5:name.startsWith('Wing')?15:1;
  this.overrides[index]=clamp(value,name==='MouthWidth'?.5:['MouthOpen','JawOffset','EyeOpenLeft','EyeOpenRight','Blink','Breath'].includes(name)?0:-limit,limit);this.overrideMask[index]=1;
 }
 clearOverride(name){if(name===undefined)this.overrideMask.fill(0);else if(P[name]!==undefined)this.overrideMask[P[name]]=0;}
 constructor(seed=1){
  this.seed=seed>>>0||1;const random=()=>{let x=this.seed;x^=x<<13;x^=x>>>17;x^=x<<5;this.seed=x>>>0;return this.seed/4294967296;};
  this.overrides=new Float32Array(ParameterNames.length);this.overrideMask=new Uint8Array(ParameterNames.length);
  this.blend=new AnimationBlendController();this.values=new Float32Array(ParameterNames.length);
  this.values[P.EyeOpenLeft]=this.values[P.EyeOpenRight]=this.values[P.MouthWidth]=1;
  this.idle=new ProceduralIdleController(random);this.eyes=new EyeController(random);this.mouth=new MouthController();this.wings=new WingController();this.face=new FacialController(random);
 }
 update(dt,input){
  dt=clamp(Number.isFinite(dt)?dt:0,0,.05);const b=this.blend;b.reset();
  this.idle.update(dt,b,input);this.eyes.update(dt,b,input);this.mouth.update(dt,b,input);this.wings.update(dt,b,input,this.idle,this.mouth);this.face.update(dt,b,input,this.mouth);
  if(input.manual){b.write(P.HeadAngleX,clamp(input.headX||0,-20,20),60);b.write(P.HeadAngleY,clamp(input.headY||0,-20,20),60);b.write(P.HeadAngleZ,clamp(input.headZ||0,-15,15),60);b.write(P.EyeLookX,clamp(input.eyeX||0,-1,1),60);b.write(P.EyeLookY,clamp(input.eyeY||0,-1,1),60);}
  const range=clamp(input.headRange??15,0,20);
  b.values[P.HeadAngleX]=clamp(b.values[P.HeadAngleX],-range,range);b.values[P.HeadAngleY]=clamp(b.values[P.HeadAngleY],-range,range);b.values[P.HeadAngleZ]=clamp(b.values[P.HeadAngleZ],-Math.min(15,range),Math.min(15,range));
  b.values[P.NeckCompensation]=-b.values[P.HeadAngleX]*.3;
  b.values[P.MouthWidth]=1+b.values[P.MouthForm]*.1;
  for(let i=0;i<this.overrideMask.length;i++)if(this.overrideMask[i])b.write(i,this.overrides[i],70);
  b.values[P.HeadAngleX]=clamp(b.values[P.HeadAngleX],-range,range);b.values[P.HeadAngleY]=clamp(b.values[P.HeadAngleY],-range,range);
  b.values[P.HeadAngleZ]=clamp(b.values[P.HeadAngleZ],-Math.min(15,range),Math.min(15,range));
  if(!this.overrideMask[P.MouthWidth])b.values[P.MouthWidth]=1+b.values[P.MouthForm]*.1;
  if(!this.overrideMask[P.NeckCompensation])b.values[P.NeckCompensation]=-b.values[P.HeadAngleX]*.3;
  if(this.overrideMask[P.Blink]){
   if(!this.overrideMask[P.EyeOpenLeft])b.values[P.EyeOpenLeft]=Math.max(.025,1-b.values[P.Blink]);
   if(!this.overrideMask[P.EyeOpenRight])b.values[P.EyeOpenRight]=Math.max(.025,1-b.values[P.Blink]);
  }
  if(!this.overrideMask[P.JawOffset])b.values[P.JawOffset]=b.values[P.MouthOpen];
  for(let i=0;i<this.values.length;i++)this.values[i]=smooth(this.values[i],b.values[i],dt,i===P.MouthOpen||i===P.JawOffset?(b.values[i]>this.values[i]?.008:.025):(i===P.EyeOpenLeft || i===P.EyeOpenRight) ? .018 : .13);
  if(!this.overrideMask[P.JawOffset])this.values[P.JawOffset]=this.values[P.MouthOpen];
  return this.values;
 }
}
