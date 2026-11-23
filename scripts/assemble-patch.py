"""Register original generated textile sprites; never resample source PNGs."""
from pathlib import Path
from collections import deque
from math import floor, ceil
import json, hashlib
from PIL import Image

root=Path(__file__).resolve().parents[1]
pack=root/'src/VtuberFriends/wwwroot/puppets/patch-dragon'
m=json.loads((pack.parent/'ember-dragon/rig.json').read_text(encoding='utf-8'))
m.update(id='patch-dragon',name='Remiendo · Puppet 2D',provenance='Original ImageGen textile dragon concept, reconstructed as independent sprites. Not exact pixel extraction.',gazeScale=[.3,.22],surfaceSmile=30,browMotionScale=.7)
parts={p['id']:p for p in m['parts']};nodes={n['id']:n for n in m['nodes']}
def texture(part,src,rect):
    image=Image.open(pack/src).convert('RGBA');alpha=image.getchannel('A')
    lo,hi=alpha.getextrema();assert lo==0 and hi>=250,src
    b=alpha.point(lambda v:255 if v>=77 else 0).getbbox()
    part.update(src=src,rect=rect,uv=[b[0]/image.width,b[1]/image.height,b[2]/image.width,b[3]/image.height])
    part.pop('flipX',None)
    return image,b
head,b=texture(parts['head'],'head.png',[320,0,896,620])
texture(parts['torso'],'torso.png',[420,535,696,540])
texture(parts['wing-left'],'wing-left.png',[5,425,570,530])
texture(parts['wing-right'],'wing-right.png',[961,425,570,530])
alpha=head.getchannel('A')
for side,u0,u1 in [('left',.19,.49),('right',.51,.81)]:
    x0,x1=int(head.width*u0),int(head.width*u1);y0,y1=int(head.height*.4),int(head.height*.72)
    unseen={(x,y) for y in range(y0,y1) for x in range(x0,x1) if alpha.getpixel((x,y))<25}
    components=[]
    while unseen:
        seed=unseen.pop();q=deque([seed]);component=[seed];touch=False
        while q:
            x,y=q.popleft();touch|=x in (x0,x1-1) or y in (y0,y1-1)
            for point in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)]:
                if point in unseen: unseen.remove(point);q.append(point);component.append(point)
        if not touch:components.append(component)
    hole=max(components,key=len);assert len(hole)>2000,(side,'Missing transparent aperture')
    px0,py0=min(x for x,y in hole),min(y for x,y in hole);px1,py1=max(x for x,y in hole)+1,max(y for x,y in hole)+1
    left=320+(px0-b[0])/(b[2]-b[0])*896;right=320+(px1-b[0])/(b[2]-b[0])*896
    top=(py0-b[1])/(b[3]-b[1])*620;bottom=(py1-b[1])/(b[3]-b[1])*620
    m['eyeBounds'][side]=[floor(left)-2,floor(top)-2,ceil(right)+2,ceil(bottom)+2]
    width,height=right-left,bottom-top;center=left+width*(.64 if side=='left' else .36);cy=(top+bottom)/2
    parts['eye-dark-'+side]['rect']=[left-20,top-20,width+40,height+40]
    texture(parts['eye-bg-'+side],'sclera.png',[left-20,top-20,width+40,height+40])
    texture(parts['eye-'+side],'iris.png',[center-height*.38,cy-height*.56,height*.76,height*1.12])
    nodes['eye-'+side]['pivot']=[center,cy]
    texture(parts['lid-'+side+'-upper'],'lid-upper.png',[left-100,top-260,width+200,255])
    texture(parts['lid-'+side+'-lower'],'lid-lower.png',[left-80,bottom+5,width+160,210])
    nodes['lid-'+side+'-upper']['travel']=height+120
    nodes['lid-'+side+'-lower']['travel']=-height*.6-30
    texture(parts['brow-'+side],'brow.png',[left-5,top-65,width+10,48])
    if side=='right':parts['brow-'+side]['flipX']=True
    nodes['brow-'+side]['pivot']=[(left+right)/2,top-40]
    print(side,'aperture',m['eyeBounds'][side],'iris center',round(center,1))
m['surfaceMouth']=[603,490,330,110]
for id in ['mouth','tongue']:parts[id]['rect']=m['surfaceMouth'].copy()
parts['tongue']['color']=[194,120,115,255]
for side,x in [('left',647),('right',853)]:
    t=(x+18-603)/330
    from math import sin, pi
    y=490+30*sin(pi*t)**.8
    texture(parts['fang-'+side],'fang-clean.png',[x,y,36,40])
bandana=dict(id='bandana',node='torso',deform='none',alphaCutoff=.3,opaqueCutout=True)
texture(bandana,'bandana.png',[570,565,465,215])
m['parts'].insert(next(i for i,p in enumerate(m['parts']) if p['id']=='torso')+1,bandana)
m['requiredParts'].append('bandana')
m['anchors']['mouth']['position']=[768,520]
(pack/'rig.json').write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
assets=[]
for file in sorted(pack.glob('*.png')):
    data=file.read_bytes();assets.append(dict(file=file.name,sha256=hashlib.sha256(data).hexdigest(),bytes=len(data)))
(pack/'provenance.json').write_text(json.dumps(dict(date='2026-11-20',method=m['provenance'],assets=assets),indent=2)+'\n',encoding='utf-8')
(pack/'LEEME.md').write_text('Remiendo: amarillo/lima, tejido y parches. Cabeza sin boca ni dientes pintados. Iris, fondo y cortinas separados; boca interpolada sin jaw, colmillos de fieltro. Mascada azul paisley en capa bandana, parent torso. Originales PNG intactos, UV registrados por alpha. Concepto y reconstruccion generados con ImageGen; prompts en generation-notes.json.\n',encoding='utf-8')
print('Remiendo: 21 parts registered, including independent paisley scarf.')
