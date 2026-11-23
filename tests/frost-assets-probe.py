"""Read-only Boreal texture inspection, not a GPU test."""
from pathlib import Path
from PIL import Image
import sys,runpy,json
root=Path(__file__).resolve().parents[1];sys.argv=['jade-assets-probe.py','frost-dragon']
runpy.run_path(str(root/'tests/jade-assets-probe.py'),run_name='__main__')
pack=root/'src/VtuberFriends/wwwroot/puppets/frost-dragon';m=json.loads((pack/'rig.json').read_text(encoding='utf-8'))
head=Image.open(pack/'head.png').convert('RGBA');extents=[]
for x0,y0,x1,y1 in [(.1,0,.42,.47),(.65,.12,.9,.47)]:
    icy=[]
    for y in range(int(head.height*y0),int(head.height*y1),2):
        for x in range(int(head.width*x0),int(head.width*x1),2):
            r,g,b,a=head.getpixel((x,y))
            if a>200 and r>100 and b>r+20 and g>r+10:icy.append(y)
    assert len(icy)>100,'Missing icy horn region';extents.append(max(icy)-min(icy))
assert extents[0]>extents[1]*1.5,('Do not equalize horns',extents)
print('PASS: image-left icy horn visibly taller than image-right; original asymmetric texture preserved without mirroring.')
