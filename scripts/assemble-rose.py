"""Register original sprites and layer order; PNG pixels stay unchanged."""
from pathlib import Path
from collections import deque
from math import floor,ceil,sin,pi
from PIL import Image
import json,hashlib
root=Path(__file__).resolve().parents[1];pack=root/'src/VtuberFriends/wwwroot/puppets/rose-dragon'
m=json.loads((pack.parent/'ember-dragon/rig.json').read_text(encoding='utf-8'))
m.update(id='rose-dragon',name='Rosalía · Puppet 2D',provenance='Generative reconstruction of supplied pink female dragon reference. Original preserved; not exact extraction.',surfaceSmile=16,surfaceSlant=-22,gazeScale=[.3,.2],browMotionScale=.65,integratedForelock=True,hairMotionScale=.25)
parts={p['id']:p for p in m['parts']};nodes={n['id']:n for n in m['nodes']}
def texture(part,src,rect):
    image=Image.open(pack/src).convert('RGBA');alpha=image.getchannel('A');lo,hi=alpha.getextrema();assert lo==0 and hi>=250,src
    b=alpha.point(lambda v:255 if v>=77 else 0).getbbox()
    part.update(src=src,rect=rect,uv=[b[0]/image.width,b[1]/image.height,b[2]/image.width,b[3]/image.height],alphaCutoff=.3)
    part.pop('flipX',None)
    return image,b
def aperture(image,roi):
    alpha=image.getchannel('A');x0,y0,x1,y1=roi
    unseen={(x,y) for y in range(y0,y1) for x in range(x0,x1) if alpha.getpixel((x,y))<25};components=[]
    while unseen:
        seed=unseen.pop();queue=deque([seed]);component=[seed];touch=False
        while queue:
            x,y=queue.popleft();touch|=x in (x0,x1-1) or y in (y0,y1-1)
            for point in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)]:
                if point in unseen:unseen.remove(point);queue.append(point);component.append(point)
        if not touch:components.append(component)
    hole=max(components,key=len);assert len(hole)>1500,'Missing real eye opening'
    return [min(x for x,y in hole),min(y for x,y in hole),max(x for x,y in hole)+1,max(y for x,y in hole)+1]
head,b=texture(parts['head'],'head-v2.png',[300,30,936,665])
texture(parts['torso'],'torso-v2.png',[475,600,586,470])
texture(parts['wing-left'],'wing-left.png',[20,580,565,455])
texture(parts['wing-right'],'wing-right.png',[951,580,565,455])
extras={}
def extra(id,node,src,rect,deform='face'):
    part=dict(id=id,node=node,deform=deform);texture(part,src,rect);extras[id]=part;return part
for side,x,pivot in [('left',365,[615,455]),('right',815,[935,455])]:
    node='hair-'+side;m['nodes'].append(dict(id=node,parent='head',pivot=pivot,bind='hair'+side.title()))
    extra(node,node,node+'-v2.png',[x,400,385 if side=='left' else 365,660])
for side,x,pivot in [('left',437,[697,330]),('right',839,[839,330])]:
    node='antenna-'+side;m['nodes'].append(dict(id=node,parent='head',pivot=pivot,bind='antenna'+side.title()))
    extra(node,node,node+'.png',[x,-5,260,335])
for side,u0,u1 in [('left',.24,.49),('right',.51,.76)]:
    a=aperture(head,[int(head.width*u0),int(head.height*.45),int(head.width*u1),int(head.height*.8)])
    left=300+(a[0]-b[0])/(b[2]-b[0])*936;right=300+(a[2]-b[0])/(b[2]-b[0])*936
    top=30+(a[1]-b[1])/(b[3]-b[1])*665;bottom=30+(a[3]-b[1])/(b[3]-b[1])*665
    width,height=right-left,bottom-top;center=left+width*(.63 if side=='left' else .37);cy=(top+bottom)/2
    m['eyeBounds'][side]=[floor(left)-3,floor(top)-3,ceil(right)+3,ceil(bottom)+3]
    parts['eye-dark-'+side]['rect']=[left-20,top-20,width+40,height+40]
    texture(parts['eye-bg-'+side],'sclera.png',[left-20,top-20,width+40,height+40])
    texture(parts['eye-'+side],'iris.png',[center-height*.4,cy-height*.6,height*.8,height*1.2])
    nodes['eye-'+side]['pivot']=[center,cy]
    texture(parts['lid-'+side+'-upper'],'lid-upper.png',[left-100,top-260,width+200,255])
    texture(parts['lid-'+side+'-lower'],'lid-lower.png',[left-80,bottom+5,width+160,210])
    nodes['lid-'+side+'-upper']['travel']=height+120;nodes['lid-'+side+'-lower']['travel']=-height*.6-30
    texture(parts['brow-'+side],'brow.png',[left+5,top-58,width-10,35]);nodes['brow-'+side]['pivot']=[(left+right)/2,top-40]
    if side=='right':parts['brow-'+side]['flipX']=True
    # Fit the shared UPPER liner to the real aperture, not a rectangular eye frame.
    lashes=extra('lashes-'+side,'head','lashes-upper.png',[left,top-35,width,height])
    image=Image.open(pack/lashes['src']).convert('RGBA');la=image.getchannel('A')
    bb=la.point(lambda value:255 if value>=77 else 0).getbbox();fraction=.36
    rw=width/(1-fraction);rh=rw*(bb[3]-bb[1])/(bb[2]-bb[0]);rx=left-fraction*rw if side=='left' else left;ry=top-35
    lashes['rect']=[rx,ry,rw,rh];lashes['lashMask']=True
    if side=='right':lashes['flipX']=True
    ha=head.getchannel('A');contour=[]
    for px in range(a[0],a[2]):
        ys=[py for py in range(a[1],a[3]) if ha.getpixel((px,py))<25]
        if ys:contour.append((300+(px-b[0])/(b[2]-b[0])*936,30+(min(ys)-b[1])/(b[3]-b[1])*665))
    def target_y(x):
        from bisect import bisect_left
        i=bisect_left([point[0] for point in contour],x)
        if i==0:return contour[0][1]
        if i==len(contour):return contour[-1][1]
        x0,y0=contour[i-1];x1,y1=contour[i];return y0+(y1-y0)*(x-x0)/(x1-x0)
    def raw_y(u):
        su=u if side=='left' else 1-u;px=min(bb[2]-1,max(bb[0],round(bb[0]+su*(bb[2]-bb[0]))))
        ys=[y for y in range(bb[1],bb[3]) if la.getpixel((px,y))>=77]
        return ry+((max(ys) if ys else bb[1])-bb[1])/(bb[3]-bb[1])*rh
    boundary=fraction if side=='left' else 1-fraction;boundary_shift=target_y(rx+boundary*rw)-raw_y(boundary)
    offsets=[]
    for i in range(9):
        u=i/8;x=rx+u*rw
        offsets.append(boundary_shift if (side=='left' and u<fraction) or (side=='right' and u>1-fraction) else target_y(x)-raw_y(u))
    lashes['lashOffsets']=offsets
    print(side,'eye bounds',m['eyeBounds'][side])
m['surfaceMouth']=[670,590,210,85]
for id in ['mouth','tongue']:parts[id]['rect']=m['surfaceMouth'].copy()
for side,x in [('left',702),('right',816)]:
    t=(x+10-670)/210;y=590+16*sin(pi*t)**.8-22*(t-.5)
    texture(parts['fang-'+side],'fang-white.png',[x,y,20,25])
m['anchors']['mouth']['position']=[775,603]
for side in ['left','right']:
    wing=parts['wing-'+side]
    stars=[[.29,.59,.042,0],[.46,.48,.033,1.9],[.53,.66,.046,3.8],[.64,.53,.022,2.6],[.39,.64,.018,5.1],[.72,.43,.025,.8]]
    if side=='right':stars=[[1-u,v,r,phase+1.2] for u,v,r,phase in stars]
    extras['sparkles-'+side]=dict(id='sparkles-'+side,node=wing['node'],kind='solid',color=[255,240,252,255],uv=[0,0,1,1],rect=wing['rect'].copy(),deform=wing['deform'],sparkles=stars,alphaCutoff=.001)
order=['wing-left','sparkles-left','wing-right','sparkles-right','torso','hair-left','hair-right','head','antenna-left','antenna-right','brow-left','brow-right']
for side in ['left','right']:order+=['eye-dark-'+side,'eye-bg-'+side,'eye-'+side,'lid-'+side+'-upper','lid-'+side+'-lower','lashes-'+side]
order+=['mouth','tongue','fang-left','fang-right']
m['parts']=[(parts|extras)[id] for id in order];m['requiredParts']=order.copy()
(pack/'rig.json').write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
assets=[]
for file in sorted(pack.glob('*.png')):
    data=file.read_bytes();assets.append(dict(file=file.name,sha256=hashlib.sha256(data).hexdigest(),bytes=len(data)))
(pack/'provenance.json').write_text(json.dumps(dict(date='2026-11-20',method=m['provenance'],assets=assets),indent=2)+'\n',encoding='utf-8')
(pack/'LEEME.md').write_text('Rosalia: referencia conservada. Reconstruccion ImageGen por piezas, no extraccion exacta. Cabeza sin boca ni dientes; iris/fondos/parpados separados. Revision2: copete/flequillo integrados en cabeza para evitar flotacion; ojos > pestanas encima. Melena con raices anchas superpuestas, cuello corto y ojos entrecerrados. Antenas y mechones con nodos propios. Boca de superficie inclinada y dos colmillos, sin jaw. Revision3: colmillos blancos simples. Pestana superior compartida y reflejada, ajustada por contorno y excluida del hueco ocular; sin contorno inferior. Destellos procedurales independientes deformados igual que cada ala, sin PNG de estrellas ni RAF extra. Originales PNG intactos, registro UV por alpha. Prompts en generation-notes.json.\n',encoding='utf-8')
print('Rosalia registered:',len(m['parts']),'layers; antennae, hair, eye-over-hair, smirk and wing sparkles.')
