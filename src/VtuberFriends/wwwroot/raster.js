// Logical layout stays 400 x 300; pixel allocation follows the actual output viewport.
export function rasterSize(logicalWidth,logicalHeight,cssWidth,dpr=1,quality='medium'){
 const valid=n=>Number.isFinite(n)&&n>0;
 const ratio=valid(dpr)?Math.min(dpr,3):1,css=valid(cssWidth)?cssWidth:logicalWidth;
 const cap=quality==='low'?1024:quality==='high'?3072:2048,sample=quality==='low'?.75:quality==='high'?1.2:1;
 const quantum=logicalWidth===300?96:64;
 const width=Math.max(quantum*2,Math.min(cap,Math.ceil(css*ratio*sample/quantum)*quantum));
 return {width,height:Math.round(width*logicalHeight/logicalWidth)};
}
export function effectRaster(view,quality){
 const bounds=view.container?.getBoundingClientRect?.();
 const scale=bounds?.width>0&&bounds?.height>0?Math.min(bounds.width/400,bounds.height/300):1;
 return rasterSize(400,300,400*scale,globalThis.devicePixelRatio||1,quality);
}
export function applyEffectRaster(canvases,contexts,view,quality){
 const size=effectRaster(view,quality);
 canvases.forEach((canvas,i)=>{if(canvas.width!==size.width||canvas.height!==size.height){canvas.width=size.width;canvas.height=size.height;contexts[i].setTransform(size.width/400,0,0,size.height/300,0,0);}});
}
