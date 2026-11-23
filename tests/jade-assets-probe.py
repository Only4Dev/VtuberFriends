"""Read-only alpha/registration checks for the generated Jade layers."""
from pathlib import Path
from PIL import Image
import json, sys
pack = Path(__file__).resolve().parents[1] / 'src/VtuberFriends/wwwroot/puppets' / (sys.argv[1] if len(sys.argv)>1 else 'jade-dragon')
manifest = json.loads((pack / 'rig.json').read_text(encoding='utf-8'))
parts = {part['id']: part for part in manifest['parts']}
images = {src: Image.open(pack / src).convert('RGBA') for src in {part['src'] for part in manifest['parts'] if 'src' in part}}
def alpha(part, x, y, dy=0):
    rx, ry, rw, rh = part['rect']; u, v = (x-rx)/rw, (y-dy-ry)/rh
    if not (0 <= u <= 1 and 0 <= v <= 1): return 0
    if 'src' not in part: return part['color'][3]
    image, uv = images[part['src']], part['uv']
    if part.get('flipX'): u = 1-u
    px = min(image.width-1, int((uv[0]+u*(uv[2]-uv[0]))*image.width))
    py = min(image.height-1, int((uv[1]+v*(uv[3]-uv[1]))*image.height))
    value = image.getpixel((px,py))[3]
    if part.get('opaqueCutout'): return 255 if value >= part.get('alphaCutoff',0)*255 else 0
    return value
for side in ['left','right']:
    x0,y0,x1,y1=manifest.get('eyeBounds',{}).get(side, [560,520,710,659] if side=='left' else [835,520,975,659])
    holes = [(x,y) for y in range(y0,y1,2) for x in range(x0,x1,2) if alpha(parts['head'],x,y)<25]
    assert len(holes)>max(300, (x1-x0)*(y1-y0)*.25/4), 'Head must have real transparent eye openings relative to its bounds'
    travel={n['id']:n.get('travel',0) for n in manifest['nodes']};covered = sum(max(alpha(parts['lid-'+side+'-upper'],x,y,travel['lid-'+side+'-upper']),alpha(parts['lid-'+side+'-lower'],x,y,travel['lid-'+side+'-lower']))>200 for x,y in holes)
    assert covered/len(holes)>.99, (side, covered/len(holes))
    assert parts['eye-'+side]['src']=='iris.png'
    assert parts['eye-bg-'+side]['src']=='sclera.png'
    assert parts['eye-bg-'+side]['node']=='head'
    print(f'PASS: {side}: separate iris/background, transparent head opening, closed curtains cover {covered/len(holes):.1%}.')
for name,image in images.items():
    assert image.getpixel((0,0))[3]<8, name
print('PASS: source PNG transparency; assets inspected without modification. Not a GPU blink test.')
