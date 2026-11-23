export function cyberGlowStrength(time,intensity){
 return Math.max(0,Math.min(1,intensity))*(.65+.35*(.5-.5*Math.cos((Number.isFinite(time)?time:0)*Math.PI*2/4.8)));
}
export function mintMask(r,g,b){
 const smooth=(a,z,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(z-a)));return t*t*(3-2*t);};
 return smooth(.055,.17,g-Math.max(r,b))*smooth(.45,.7,g);
}
