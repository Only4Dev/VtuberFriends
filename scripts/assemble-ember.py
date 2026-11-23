"""Register generated sprites without modifying their pixels."""
from pathlib import Path
from PIL import Image
import json, hashlib

root = Path(__file__).resolve().parents[1]
pack = root / 'src/VtuberFriends/wwwroot/puppets/ember-dragon'
m = json.loads((pack.parent / 'thoxer-dragon/rig.json').read_text(encoding='utf-8'))
m.update(id='ember-dragon', name='Ascua · Puppet 2D', provenance='Generative reconstruction from supplied fire dragon reference; original preserved. Independent sprites, not exact pixel extraction.', cyberGlow=False, glowPalette='ember', gazeScale=[.25,.18], browMotionScale=.55)
parts = {p['id']: p for p in m['parts']}
nodes = {n['id']: n for n in m['nodes']}
def texture(part, src, rect):
    image = Image.open(pack / src)
    alpha = image.getchannel('A')
    assert alpha.getextrema() == (0,255), src
    b = alpha.point(lambda v: 255 if v >= 77 else 0).getbbox()
    part.update(src=src, rect=rect, uv=[b[0]/image.width,b[1]/image.height,b[2]/image.width,b[3]/image.height])
    part.pop('flipX',None)
texture(parts['head'],'head.png',[300,0,936,670])
texture(parts['torso'],'torso.png',[410,590,716,480])
texture(parts['wing-left'],'wing-left.png',[20,540,565,515])
texture(parts['wing-right'],'wing-right.png',[951,540,565,515])
for side, x, center in [('left',565,674),('right',820,862)]:
    m['eyeBounds'][side] = [x,395,x+150,460]
    parts['eye-dark-'+side]['rect']=[x-15,380,180,100]
    texture(parts['eye-bg-'+side],'sclera.png',[x-20,375,190,110])
    texture(parts['eye-'+side],'iris.png',[center-36,390,72,72])
    nodes['eye-'+side]['pivot']=[center,426]
    texture(parts['lid-'+side+'-upper'],'lid-upper.png',[x-70,170,290,225])
    texture(parts['lid-'+side+'-lower'],'lid-lower.png',[x-60,454,270,150])
    nodes['lid-'+side+'-upper']['travel']=155
    nodes['lid-'+side+'-lower']['travel']=-45
    texture(parts['brow-'+side],'brow-'+side+'.png',[x-10,315,175,75])
    nodes['brow-'+side]['pivot']=[x+75,350]
m['surfaceMouth']=[635,555,266,90]
for id in ['mouth','tongue']: parts[id]['rect']=m['surfaceMouth'].copy()
for side,x in [('left',675),('right',833)]:
    texture(parts['fang-'+side],'fang.png',[x,565,28,32])
m['anchors']['mouth']['position']=[768,570]
(pack/'rig.json').write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
assets=[]
for file in sorted(pack.glob('*.png')):
    data=file.read_bytes()
    assets.append(dict(file=file.name,sha256=hashlib.sha256(data).hexdigest(),bytes=len(data)))
(pack/'provenance.json').write_text(json.dumps(dict(date='2026-11-20',method=m['provenance'],assets=assets),indent=2)+'\n',encoding='utf-8')
(pack/'LEEME.md').write_text('Ascua: cabeza completa sin boca ni dientes pintados; pupilas, fondos y cortinas independientes. Dos colmillos siguen el labio de la boca interpolada, sin jaw. Cejas y alas separadas. PNG generados con ImageGen desde referencia; no extraccion exacta. Registro por UV, originales sin modificar.\n',encoding='utf-8')
print('Ascua: registered 20 parts from 11 independent generated sprites.')
