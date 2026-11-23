// Fixed wing-local stars: one overlay per wing, driven by the Puppet's clock.
export function sparklePulse(time,phase){return Math.pow(.5+.5*Math.sin(time*2.3+phase),3);}
export function packSparkles(stars=[]){const packed=new Float32Array(32);stars.forEach((star,i)=>packed.set(star,i*4));return packed;}
