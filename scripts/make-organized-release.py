"""New portable folder; originals/configured installations are never modified."""
from pathlib import Path
import json, shutil, zipfile, datetime, hashlib, struct, zlib
root=Path(__file__).resolve().parents[1]
version=__import__("re").search(r'const string Version="([0-9.]+)"',(root/"src/VtuberFriends/UpdateService.cs").read_text(encoding="utf-8")).group(1)
source=root/'artifacts/win-x64'
target=root/'Distribucion'/('VtuberFriends-'+version+'-'+datetime.datetime.now().strftime('%Y%m%d-%H%M%S'))
app=target/'app';app.mkdir(parents=True,exist_ok=False)
def names(v):
 if isinstance(v,str):return {v} if v.endswith('.png') else set()
 if isinstance(v,list):return set().union(*(names(x) for x in v)) if v else set()
 if isinstance(v,dict):return names(list(v.values()))
 return set()
allowed={p.parent.name:names(json.loads(p.read_text(encoding='utf-8-sig')))|{'rig.json'} for p in (source/'wwwroot/puppets').glob('*/rig.json')}
before=0;after=0
def recompress(data):
 if not data.startswith(b'\x89PNG\r\n\x1a\n'):return data
 chunks=[];offset=8
 while offset<len(data):
  n=struct.unpack('>I',data[offset:offset+4])[0];kind=data[offset+4:offset+8];value=data[offset+8:offset+8+n];chunks.append((kind,value));offset+=12+n
 stream=b''.join(v for k,v in chunks if k==b'IDAT');raw=zlib.decompress(stream);compressed=zlib.compress(raw,9)
 if len(compressed)>=len(stream):return data
 assert zlib.decompress(compressed)==raw # Identical filtered scanlines: no pixel resampling or quality change.
 result=bytearray(data[:8]);inserted=False
 for kind,value in chunks:
  if kind==b'IDAT':
   if inserted:continue
   value=compressed;inserted=True
  result+=struct.pack('>I',len(value))+kind+value+struct.pack('>I',zlib.crc32(kind+value)&0xffffffff)
 return bytes(result)
for p in source.rglob('*'):
 if not p.is_file():continue
 rel=p.relative_to(source);parts=rel.parts
 keep=(len(parts)==1 and (p.suffix=='.dll' or p.name in {'VtuberFriends.exe','VtuberFriends.deps.json','VtuberFriends.runtimeconfig.json'})) or parts[0]=='native' and p.suffix in {'.dll','.json','.txt'} or parts[0]=='wwwroot' and p.suffix in {'.html','.css','.js','.svg','.png','.json','.woff','.woff2','.ttf','.txt'}
 if len(parts)>3 and parts[:2]==('wwwroot','puppets'):keep='/'.join(parts[3:]) in allowed.get(parts[2],set())
 if not keep:continue
 out=app/rel;out.parent.mkdir(parents=True,exist_ok=True);data=p.read_bytes();before+=len(data)
 if p.suffix=='.png':
  cache=root/'.tools/png-cache'/(hashlib.sha256(data).hexdigest()+'.png')
  data=cache.read_bytes() if cache.exists() else recompress(data)
 out.write_bytes(data);after+=len(data)
runner=root/'artifacts/patch-runner'
for name in ['VtuberFriends.Patch.dll','VtuberFriends.Patch.deps.json','VtuberFriends.Patch.runtimeconfig.json']:shutil.copy2(runner/name,app/name)
shutil.copy2(runner/'VtuberFriends.Patch.exe',app/'Aplicar parche.exe')
shutil.copy2(root/'artifacts/VtuberFriends-launcher.exe',target/'VtuberFriends.exe')
(target/'Sonidos').mkdir();shutil.copy2(root/'Sonidos/LEEME.txt',target/'Sonidos/LEEME.txt')
(target/'LEEME.txt').write_text('Vtuber & Friends 0.6.0\nAbre VtuberFriends.exe. Conserva app y Sonidos junto a él.\nConfiguración, token cifrado y avatares se guardan junto al ejecutable, nunca dentro del programa actualizable.\nActualizaciones: Configuración > Buscar actualizaciones. Instala después del directo.\nNo incluye datos personales. No necesitas instalar .NET.\n',encoding='utf-8')
archive=target.parent/(target.name+'.zip')
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for p in target.rglob('*'):
  if p.is_file():z.write(p,p.relative_to(target).as_posix())
with zipfile.ZipFile(archive) as z:assert z.testzip() is None
report=dict(directory=str(target),zip=str(archive),runtimeAndAssetsBefore=before,runtimeAndAssetsAfter=after,pngLosslessBytesSaved=before-after,zipBytes=archive.stat().st_size,rootFiles=sorted(p.name for p in target.iterdir()))
(root/'artifacts/organized-release.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report))
