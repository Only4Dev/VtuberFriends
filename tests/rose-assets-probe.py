"""Read-only asset inspection, not a GPU rendering test."""
from pathlib import Path
from PIL import Image
import json,sys,runpy
root=Path(__file__).resolve().parents[1]
sys.argv=['jade-assets-probe.py','rose-dragon']
runpy.run_path(str(root/'tests/jade-assets-probe.py'),run_name='__main__')
pack=root/'src/VtuberFriends/wwwroot/puppets/rose-dragon'
m=json.loads((pack/'rig.json').read_text(encoding='utf-8'))
parts={p['id']:p for p in m['parts']}
for side in ['left','right']:
    i=Image.open(pack/parts['lashes-'+side]['src']).convert('RGBA')
    assert i.getpixel((i.width//2,i.height//2))[3]<25,'Upper lash must leave eye clear'
    assert parts['lashes-'+side]['src']=='lashes-upper.png'
    assert parts['lashes-'+side]['lashMask'] and len(parts['lashes-'+side]['lashOffsets'])==9
    assert max(i.getpixel((x,y))[3] for y in range(int(i.height*.7),int(i.height*.95),3) for x in range(int(i.width*.35),int(i.width*.7),3))<25,'No lower contour in upper lash sprite'
    wing=parts['wing-'+side];i=Image.open(pack/wing['src']).convert('RGBA');uv=wing['uv'];aspect=wing['rect'][2]/wing['rect'][3]
    for u,v,r,phase in parts['sparkles-'+side]['sparkles']:
        for dx,dy in [(0,0),(1,0),(-1,0),(0,1),(0,-1),(.25,.25),(-.25,.25),(.25,-.25),(-.25,-.25)]:
            x=int((uv[0]+(u+dx*r/aspect)*(uv[2]-uv[0]))*i.width)
            y=int((uv[1]+(v+dy*r)*(uv[3]-uv[1]))*i.height)
            assert i.getpixel((x,y))[3]>=77,(side,'Sparkle outside wing',u,v,dx,dy)
fang=Image.open(pack/parts['fang-left']['src']).convert('RGBA')
colors=[(r,g,b) for r,g,b,a in (fang.get_flattened_data() if hasattr(fang,'get_flattened_data') else fang.getdata()) if a>200]
assert colors and sum(min(c) for c in colors)/len(colors)>230,'Fang must be white'
assert max(max(c)-min(c) for c in colors)<20,'Fang must have neutral shading, no pink tint'
assert parts['lashes-left']['src']==parts['lashes-right']['src']
assert not parts['lashes-left'].get('flipX') and parts['lashes-right']['flipX']
print('PASS: one shared upper lash, mirrored right, no lower outline, inverse eye mask; neutral white fangs; stars remain inside wings.')

# Independently sample the raster liner underside and real head aperture at mesh columns.
h=parts['head'];head=Image.open(pack/h['src']).convert('RGBA');ha=head.getchannel('A')
for side in ['left','right']:
    d=parts['lashes-'+side];image=Image.open(pack/d['src']).convert('RGBA');alpha=image.getchannel('A');rx,ry,rw,rh=d['rect'];uv=d['uv'];errors=[]
    for k in range(25):
        u=k/24;x=rx+u*rw;bounds=m['eyeBounds'][side]
        if not bounds[0]+5<x<bounds[2]-5:continue
        hx=int((h['uv'][0]+(x-h['rect'][0])/h['rect'][2]*(h['uv'][2]-h['uv'][0]))*head.width)
        rows=[]
        for y in range(bounds[1],bounds[3]):
            hy=int((h['uv'][1]+(y-h['rect'][1])/h['rect'][3]*(h['uv'][3]-h['uv'][1]))*head.height)
            if ha.getpixel((hx,hy))<25:rows.append(y)
        if not rows:continue
        su=1-u if d.get('flipX') else u;px=min(image.width-1,int((uv[0]+su*(uv[2]-uv[0]))*image.width))
        painted=[y for y in range(image.height) if alpha.getpixel((px,y))>=77]
        raw=ry+(max(painted)/image.height-uv[1])/(uv[3]-uv[1])*rh;t=u*8;j=min(7,int(t))
        offset=d['lashOffsets'][j]+(d['lashOffsets'][j+1]-d['lashOffsets'][j])*(t-j)
        errors.append(abs(raw+offset-min(rows)))
    assert len(errors)>=12 and max(errors)<2,(side,'Upper lash does not follow real eye contour',errors)
print('PASS: upper-liner fit within 2 world units at actual mesh columns on both eyes; no source PNG pixels edited.')
