// Procedural, premultiplied effects. Same mesh, clock, reveal and lifetime as the Puppet.
export const propKinds={'phone':1,'galaxy':2,'nose-smoke':3,'aura':4,'floor-smoke':5,'lightning':6,'aura-runes':7,'aura-aurora':8,'aura-embers':9};
export const propShader=`
uniform float uPropKind;
uniform vec4 uPropParams;
uniform vec3 uPropColor;
uniform vec2 uPropExtra;
float propHash(float n){return fract(sin(n*127.1+311.7)*43758.54);}
float propLine(vec2 p,vec2 a,vec2 b){vec2 d=b-a;return length(p-a-d*clamp(dot(p-a,d)/max(.0001,dot(d,d)),0.0,1.0));}
vec4 propEffect(vec2 uv,vec4 original){
 float t=uPropParams.x*uPropParams.z,light=0.0;vec3 tint=uPropColor;vec2 p=uv-.5;
 float border=smoothstep(0.0,.065,uv.x)*smoothstep(0.0,.065,1.0-uv.x)*smoothstep(0.0,.065,uv.y)*smoothstep(0.0,.065,1.0-uv.y);
 if(uPropKind<1.5){
  if(uv.x<.263||uv.x>.737||uv.y<.175||uv.y>.825)return original;
  vec2 q=(uv-vec2(.263,.175))/vec2(.474,.65);float scroll=mod(t*.32,3.0),page=floor(scroll),slide=smoothstep(.82,1.0,fract(scroll));q.y+=slide;
  if(q.y>1.0){q.y-=1.0;page=mod(page+1.0,3.0);}
  vec3 sky=page<.5?vec3(.12,.30,.43):page<1.5?vec3(.34,.16,.43):vec3(.12,.37,.31);
  vec3 col=mix(sky,vec3(.035,.055,.12),q.y);
  float moon=1.0-smoothstep(.09,.1,length(q-vec2(.72,.24)));col=mix(col,vec3(1.0,.86,.59),moon);
  if(page>0.5&&page<1.5){vec2 planet=q-vec2(.48,.42);float disk=1.0-smoothstep(.17,.18,length(planet));col=mix(col,vec3(.71,.46,.86)*(1.0-planet.x),disk);float orbit=abs(length(planet*vec2(.65,2.3))-.19);col+=vec3(.5,.32,.15)*exp(-orbit*250.0);}
  if(page>1.5){for(int i=0;i<5;i++){float n=float(i),height=.12+.18*(.5+.5*sin(t*3.0+n));float bar=step(abs(q.x-(.25+n*.12)),.035)*step(.58-height,q.y)*step(q.y,.58);col=mix(col,vec3(.44,.91,.74),bar);}}
  float ridge=.62+.08*sin(q.x*8.0+page*2.0)+.06*sin(q.x*17.0);col=mix(col,sky*.45,step(ridge,q.y));
  col=mix(col,vec3(.88,.96,1.0),step(.1,q.x)*step(q.x,.52)*step(.81,q.y)*step(q.y,.83));
  vec2 h=(q-vec2(.83,.63))*vec2(1.0,1.2);h.y=-h.y;float heart=(h.x*h.x+h.y*h.y-.002)*(h.x*h.x+h.y*h.y-.002)*(h.x*h.x+h.y*h.y-.002)-h.x*h.x*h.y*h.y*h.y;
  col=mix(col,vec3(1.0,.32,.5),1.0-step(0.0,heart));
  float like=pow(max(0.0,sin(t*3.0)),5.0)*(1.0-smoothstep(.015,.045,abs(length(q-vec2(.83,.63))-.08)));col+=like*vec3(.4,.1,.18);
  return vec4(col,1.0);
 }
 if(uPropKind<2.5){
  p.y*=1.8;float r=length(p),angle=atan(p.y,p.x);float spiral=.5+.5*sin(angle*3.0-r*28.0+t*.8);
  light=exp(-r*9.0)*.9+pow(spiral,9.0)*exp(-r*5.0)*.75;
  for(int i=0;i<12;i++){float n=float(i),a=n*2.399+t*(.12+.015*n),rad=.12+.021*n;vec2 s=vec2(cos(a),sin(a))*rad;light+=.0012/(length(p-s)+.006)*.15;}
  tint=mix(uPropColor,vec3(1.0,.8,.95),exp(-r*15.0));
 }else if(uPropKind<3.5){
  float period=mix(uPropParams.w,6.0,uPropExtra.y),age=mod(uPropParams.x,period)*uPropParams.z;float life=2.5;
  for(int side=0;side<2;side++)for(int j=0;j<5;j++){
   float s=float(side)*2.0-1.0,n=float(j),a=age-n*.15;
   if(a>0.0&&a<life){float k=a/life;vec2 center=vec2(.5+s*(uPropExtra.x*.5+k*.25),.82-k*.56);center.x+=sin(a*3.0+n)*.025;
    float radius=.025+k*.09;float d=length((uv-center)*vec2(1.0,.9));float puff=(1.0-smoothstep(radius*.2,radius,d))*sin(k*3.14159)*.28;light+=puff;}
  }
 }else if(uPropKind<4.5){
  float y=1.0-uv.y;
  for(int i=0;i<5;i++){float n=float(i),center=.5+sin(y*7.0-t*1.5+n*1.4)*(.16+.08*y);float d=abs(uv.x-center);float ribbon=exp(-d*d/(.0007+.0015*y));light+=ribbon*(.12+.15*sin(n+1.0))*sin(y*3.14159);}
  light+=exp(-dot(p*vec2(2.5,1.2),p*vec2(2.5,1.2))*6.0)*.2;
  for(int i=0;i<12;i++){float n=float(i),y=fract(t*(.07+propHash(n)*.08)+propHash(n+2.0));vec2 c=vec2(.15+propHash(n+5.0)*.7+.04*sin(y*12.0+n),1.0-y);light+=.0004/(length(uv-c)+.004)*sin(y*3.14159)*.35;}
 }else if(uPropKind<5.5){
  vec2 q=p*vec2(1.0,2.7);float r=length(q),a=atan(q.y,q.x);float ring=exp(-pow((r-.31)/.075,2.0));
  float wisps=.55+.3*sin(a*7.0-t*1.8+r*16.0)+.15*sin(a*13.0+t*.8);light=ring*wisps*.7;
  for(int i=0;i<8;i++){float n=float(i),ang=n*.7854+t*.35;vec2 c=vec2(cos(ang)*.31,sin(ang)*.115);float rise=fract(t*.15+n*.125);c.y-=rise*.15;light+=exp(-dot((p-c)*vec2(1.0,1.8),(p-c)*vec2(1.0,1.8))*220.0)*sin(rise*3.14159)*.18;}
 }else if(uPropKind<6.5){
  float tick=floor(t*5.0),pulse=pow(max(0.0,1.0-fract(t*5.0)),2.0)*(.3+.7*step(.4,propHash(tick)));
  for(int bolt=0;bolt<3;bolt++){float b=float(bolt),base=.15+b*.35;vec2 prev=vec2(base,.04);
   for(int i=1;i<10;i++){float n=float(i);vec2 next=vec2(base+(propHash(n+b*29.0+tick*13.0)-.5)*.17,.04+n*.1);float d=propLine(uv,prev,next);light+=(exp(-d*260.0)+.15*exp(-d*55.0))*pulse*.8;
    if(i==4||i==7){vec2 tip=next+vec2((propHash(n+tick)-.5)*.22,.1);light+=exp(-propLine(uv,next,tip)*240.0)*pulse*.5;}prev=next;}
  }
 }
 if(uPropKind>6.5){
  float r=length(p*vec2(1.0,.85)),a=atan(p.y,p.x);
  if(uPropKind<7.5){
   light=exp(-abs(r-.35)*190.0)*.6+exp(-abs(r-.39)*210.0)*.35;
   float sector=mod(a+t*.16+3.14159,.523599)-.261799;
   light+=exp(-abs(r-.30)*85.0)*pow(max(0.0,cos(sector*12.0)),16.0)*.55;
   for(int i=0;i<8;i++){float n=float(i),ang=n*.785398-t*.13;vec2 c=vec2(cos(ang),sin(ang))*.35;vec2 q=uv-.5-c;light+=exp(-min(abs(q.x+q.y),abs(q.x-q.y))*190.0)*exp(-length(q)*50.0)*.45;}
  }else if(uPropKind<8.5){
   for(int i=0;i<4;i++){float n=float(i),wave=.5+sin(uv.y*5.0+t*.4+n*.8)*.22;float d=abs(uv.x-wave);light+=exp(-d*d/(.001+n*.0003))*(.15+.12*sin(uv.y*7.0-t+n))*sin(uv.y*3.14159);}
   tint=mix(uPropColor,uPropColor.bgr,.5+.5*sin(uv.y*4.0+t*.25));
  }else{
   for(int i=0;i<16;i++){float n=float(i),age=fract(t*(.08+propHash(n)*.07)+n*.0618),ang=n*2.399+t*.45;vec2 c=vec2(.5+cos(ang)*(.15+age*.22),.95-age*.9);vec2 q=(uv-c)*vec2(1.0,.6);light+=.00012/(dot(q,q)+.00015)*sin(age*3.14159);}
   tint=mix(vec3(1.0,.29,.04),uPropColor,.45);
  }
 }
 float alpha=clamp(light*border*uPropParams.y,0.0,.92);return vec4(min(vec3(1.0),tint*(1.0+light*.25))*alpha,alpha);
}
`;
