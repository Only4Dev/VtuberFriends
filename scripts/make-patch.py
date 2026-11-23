"""Generate a version-bound delta between two clean distribution folders; never copy private data."""
import argparse,hashlib,json,pathlib,shutil,zipfile
parser=argparse.ArgumentParser();parser.add_argument('--base',required=True);parser.add_argument('--new',required=True);parser.add_argument('--id',required=True);parser.add_argument('--title',required=True);parser.add_argument('--animation',action='append',default=[]);parser.add_argument('--previous-max-slots',type=int);parser.add_argument('--accessory',action='append',default=[]);args=parser.parse_args()
root=pathlib.Path(__file__).resolve().parents[1];base=pathlib.Path(args.base).resolve();new=pathlib.Path(args.new).resolve()
import re
if not re.fullmatch(r'[-a-z0-9]{1,80}',args.id):raise ValueError('Invalid patch ID')
# Never compare against a friend's live installation or package a runtime/dependency upgrade as a tiny delta.
for distribution in [base,new]:
 if (distribution/'config.json').exists() or (distribution/'.local').exists():raise ValueError('Use clean release baselines, not personal configuration or a live installation')
for name in ['VtuberFriends.deps.json','VtuberFriends.runtimeconfig.json']:
 if (base/name).read_bytes()!=(new/name).read_bytes():raise ValueError('Runtime/dependency metadata changed: prepare a full compatible release, not this resource patch')
for file in new.rglob('*'):
 if file.is_file() and (file.suffix.lower()=='.dll' or file.relative_to(new).parts[0]=='native') and file.name!='VtuberFriends.dll':
  previous=base/file.relative_to(new)
  if not previous.exists() or previous.read_bytes()!=file.read_bytes():raise ValueError('Additional dependency changed: '+str(file.relative_to(new)))
out=root/'Distribucion'/'Parches'/args.id;out.mkdir(parents=True,exist_ok=False)
def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def allowed(path):
 return path in {'VtuberFriends.exe','VtuberFriends.dll','VtuberFriends.deps.json','VtuberFriends.runtimeconfig.json'} or path.startswith('wwwroot/') and pathlib.Path(path).suffix in {'.js','.css','.html','.svg','.png','.json','.woff2'}
changes=[]
for file in sorted(new.rglob('*')):
 if not file.is_file():continue
 name=file.relative_to(new).as_posix()
 if not allowed(name):continue
 previous=base/name;before=digest(previous) if previous.exists() else None;after=digest(file)
 if before==after:continue
 target=out/'_patch'/'payload'/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(file,target);changes.append({'path':name,'before':before,'after':after})
if not changes:raise RuntimeError('No changes')
added_accessories={}
for entry in args.accessory:
 category,value=entry.split(':',1);added_accessories.setdefault(category,[]).append(value)
old_catalog=base/'wwwroot/accessories/catalog.json';new_catalog=new/'wwwroot/accessories/catalog.json'
if old_catalog.exists() and new_catalog.exists():
 old_choices={(a['category'],a['value']) for a in json.loads(old_catalog.read_text(encoding='utf-8-sig'))}
 for a in json.loads(new_catalog.read_text(encoding='utf-8-sig')):
  if (a['category'],a['value']) not in old_choices:added_accessories.setdefault(a['category'],[]).append(a['value'])
added_accessories={k:sorted(set(v)) for k,v in added_accessories.items()}
manifest={'addedAccessoryValues':added_accessories,'format':1,'id':args.id,'title':args.title,'base':{name:digest(base/name) for name in ['VtuberFriends.deps.json','VtuberFriends.runtimeconfig.json']},'files':changes,'addedAnimations':args.animation,'previousMaxSlots':args.previous_max_slots}
(out/'_patch'/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
runner=root/'artifacts'/'patch-runner'
for name in ['VtuberFriends.Patch.dll','VtuberFriends.Patch.deps.json','VtuberFriends.Patch.runtimeconfig.json']:shutil.copy2(runner/name,out/name)
for name in ['Aplicar parche.exe','Restaurar parche.exe']:shutil.copy2(runner/'VtuberFriends.Patch.exe',out/name)
(out/'LEEME-PARCHE.txt').write_text(f"""VTUBER & FRIENDS - {args.title}
1. Configuracion > Cerrar aplicacion. En versiones con cierre04, la X del ultimo panel tambien lo detiene.
2. Extrae TODO este ZIP DENTRO de la carpeta de tu app, junto a VtuberFriends.exe.
3. Abre Aplicar parche.exe. Comprueba la version y crea un respaldo antes de reemplazar archivos.
4. Abre VtuberFriends.exe. Selecciona la nueva opcion solo cuando quieras usarla.
Tus ajustes, posiciones, token y Sonidos no se modifican. El efecto no se activa automaticamente.
Si indica version diferente, no fuerces el cambio: pide el parche para tu version.
Para volver atras: cambia las animaciones nuevas a una anterior (por ejemplo Pop), cierra la app y abre Restaurar parche.exe. Conserva .updates y _patch si quieres poder restaurar.
Si ya guardaste mas fuentes de las que admite la version anterior, la restauracion se bloquea para conservarlas.
ID: {args.id}
""",encoding='utf-8')
archive=out.with_suffix('.zip')
with zipfile.ZipFile(archive,'x',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for file in out.rglob('*'):
  if file.is_file():z.write(file,file.relative_to(out))
print(json.dumps({'patch':str(archive),'changedFiles':[c['path'] for c in changes],'bytes':archive.stat().st_size},ensure_ascii=False))
