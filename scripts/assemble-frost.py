"""Register Boreal's generated originals without changing PNG pixels."""
from pathlib import Path
from collections import deque
from math import floor,ceil,sin,pi
from PIL import Image
import json,hashlib
root=Path(__file__).resolve().parents[1];pack=root/'src/VtuberFriends/wwwroot/puppets/frost-dragon'
m=json.loads((pack.parent/'ember-dragon/rig.json').read_text(encoding='utf-8'))
m.update(id='frost-dragon',name='Boreal · Puppet 2D',provenance='Generative reconstruction of approved asymmetric turquoise ice dragon. Original reference preserved, not exact pixel extraction.',surfaceSmile=35,surfaceSlant=-60,gazeScale=[.28,.18],browMotionScale=.55,integratedForelock=True)
parts={p['id']:p for p in m['parts']};nodes={n['id']:n for n in m['nodes']}
def texture(part,src,rect):
    image=Image.open(pack/src).convert('RGBA');alpha=image.getchannel('A');lo,hi=alpha.getextrema();assert lo==0 and hi>=250,src
    b=alpha.point(lambda v:255 if v>=77 else 0).getbbox();part.update(src=src,rect=rect,uv=[b[0]/image.width,b[1]/image.height,b[2]/image.width,b[3]/image.height],alphaCutoff=.3);part.pop('flipX',None)
    return image,b
def aperture(image,roi):
    alpha=image.getchannel('A');x0,y0,x1,y1=roi;unseen={(x,y) for y in range(y0,y1) for x in range(x0,x1) if alpha.getpixel((x,y))<25};components=[]
    while unseen:
        seed=unseen.pop();queue=deque([seed]);component=[seed];touch=False
        while queue:
            x,y=queue.popleft();touch|=x in (x0,x1-1) or y in (y0,y1-1)
            for point in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)]:
                if point in unseen:unseen.remove(point);queue.append(point);component.append(point)
        if not touch:components.append(component)
    hole=max(components,key=len);assert len(hole)>1500,'Missing transparent eye opening'
    return [min(x for x,y in hole),min(y for x,y in hole),max(x for x,y in hole)+1,max(y for x,y in hole)+1]
head,b=texture(parts['head'],'head.png',[330,0,876,660])
texture(parts['torso'],'torso.png',[403,495,730,575])
texture(parts['wing-left'],'wing-left.png',[5,440,580,615])
texture(parts['wing-right'],'wing-right.png',[951,440,580,615])
nodes['wing-left-root']['pivot']=[555,500];nodes['wing-right-root']['pivot']=[981,500]
nodes['wing-left-tip']['pivot']=[300,720];nodes['wing-right-tip']['pivot']=[1236,720]
eyes={}
for side,u0,u1 in [('left',.24,.49),('right',.51,.76)]:
    a=aperture(head,[int(head.width*u0),int(head.height*.43),int(head.width*u1),int(head.height*.73)])
    left=330+(a[0]-b[0])/(b[2]-b[0])*876;right=330+(a[2]-b[0])/(b[2]-b[0])*876
    top=(a[1]-b[1])/(b[3]-b[1])*660;bottom=(a[3]-b[1])/(b[3]-b[1])*660
    eyes[side]=[left,top,right,bottom]
diameter=max(bottom-top for left,top,right,bottom in eyes.values())*1.1
for side,(left,top,right,bottom) in eyes.items():
    width,height=right-left,bottom-top;center=left+width*(.65 if side=='left' else .35);cy=bottom-diameter*.45
    m['eyeBounds'][side]=[floor(left)-2,floor(top)-2,ceil(right)+2,ceil(bottom)+2]
    parts['eye-dark-'+side]['rect']=[left-20,top-20,width+40,height+40]
    texture(parts['eye-bg-'+side],'sclera.png',[left-20,top-20,width+40,height+40])
    texture(parts['eye-'+side],'iris.png',[center-diameter/2,cy-diameter/2,diameter,diameter]);nodes['eye-'+side]['pivot']=[center,cy]
    texture(parts['lid-'+side+'-upper'],'lid-upper.png',[left-100,top-260,width+200,255]);texture(parts['lid-'+side+'-lower'],'lid-lower.png',[left-80,bottom+5,width+160,210])
    nodes['lid-'+side+'-upper']['travel']=height+120;nodes['lid-'+side+'-lower']['travel']=-height*.6-30
    bh=30 if side=='left' else 45;by=top-(45 if side=='left' else 65)
    texture(parts['brow-'+side],'brow-'+side+'.png',[left-5,by,width+10,bh]);nodes['brow-'+side]['pivot']=[(left+right)/2,by+bh/2]
    print(side,'eye aperture',m['eyeBounds'][side],'iris diameter',round(diameter,1))
m['surfaceMouth']=[655,510,330,100]
for id in ['mouth','tongue']:parts[id]['rect']=m['surfaceMouth'].copy()
for side,t in [('left',.25),('right',.8)]:
    x=655+330*t-12;y=510+35*sin(pi*t)**.8-60*(t-.5)
    texture(parts['fang-'+side],'fang-white.png',[x,y,24,30])
m['anchors']['mouth']['position']=[820,545];m['anchors']['hornLeft']['position']=[465,100];m['anchors']['hornRight']['position']=[1085,215]
(pack/'rig.json').write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
assets=[]
for file in sorted(pack.glob('*.png')):
    data=file.read_bytes();assets.append(dict(file=file.name,sha256=hashlib.sha256(data).hexdigest(),bytes=len(data)))
(pack/'provenance.json').write_text(json.dumps(dict(date='2026-11-20',method=m['provenance'],assets=assets),indent=2)+'\n',encoding='utf-8')
(pack/'LEEME.md').write_text('Boreal: cuerno grande a izquierda de imagen y pequeno a derecha, cabello integrado en cabeza. Cabeza sin boca ni colmillos pintados. Cejas distintas, aperturas oculares asimetricas, fondos/iris/cortinas separados; los iris conservan el mismo diametro y se ocultan mas bajo el parpado izquierdo. Boca de superficie inclinada con2colmillos blancos, sin jaw. Alas y cuerpo separados. PNG originales intactos, UV por alpha. Referencia aprobada conservada; reconstruccion generativa, no extraccion exacta. Prompts en generation-notes.json.\n',encoding='utf-8')
print('Boreal registered:',len(m['parts']),'layers; asymmetric horns/eyes/brows and surface smirk.')
