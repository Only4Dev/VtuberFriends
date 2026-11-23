// Same continuous field is evaluated for every body/fin/tail mesh: no independently moving cuts.
export function serpentPoint(x,y,time,amount){
 const t=Math.max(0,Math.min(1,(y-680)/680));
 return [x+Math.sin(time*1.35-t*4.6)*t*28*amount,y+(Math.cos(time*1.1475-t*5.2)-Math.cos(time*1.1475))*t*20*amount];
}
export function usesSerpent(part,rig){return rig.manifest.behavior==='serpent'&&(part.definition.deform==='serpent'||part.definition.serpent||part.definition.accessory&&part.definition.node==='torso');}
