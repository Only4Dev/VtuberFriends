// Same nine-sample vertical fit used by the vertex shader, before face deformation.
export function lashOffset(definition,u){
 const offsets=definition.lashOffsets;if(!offsets)return 0;
 const t=Math.max(0,Math.min(1,u))*8,i=Math.min(7,Math.floor(t));return offsets[i]+(offsets[i+1]-offsets[i])*(t-i);
}
