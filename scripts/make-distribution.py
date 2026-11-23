"""Copy an allowlisted runtime to a NEW folder. Never delete or edit the development tree."""
from pathlib import Path
import json, shutil, datetime, sys
root=Path(__file__).resolve().parents[1]
source=root/'artifacts/win-x64'
target=root/'Distribucion'/'VtuberFriends'
if target.exists(): target=target.with_name('VtuberFriends-'+datetime.datetime.now().strftime('%Y%m%d-%H%M%S'))
target.mkdir(parents=True,exist_ok=False)
count=0;omitted=0

def copy(path):
 global count
 out=target/path.relative_to(source);out.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(path,out);count+=1

def png_names(value):
 if isinstance(value,str):return {value} if value.endswith('.png') else set()
 if isinstance(value,dict):return set().union(*(png_names(v) for v in value.values())) if value else set()
 if isinstance(value,list):return set().union(*(png_names(v) for v in value)) if value else set()
 return set()
allowed={}
for rig in (source/'wwwroot/puppets').glob('*/rig.json'):
 allowed[rig.parent.name]=png_names(json.loads(rig.read_text(encoding='utf-8-sig')))|{'reference.png','rig.json'}
for path in source.rglob('*'):
 if not path.is_file():continue
 rel=path.relative_to(source);parts=rel.parts;keep=False
 if len(parts)==1:
  keep=path.suffix.lower()=='.dll' or path.name in {'VtuberFriends.exe','VtuberFriends.deps.json','VtuberFriends.runtimeconfig.json'}
 elif parts[0]=='native':keep=path.suffix.lower() in {'.dll','.json','.txt'}
 elif parts[0]=='wwwroot':
  if len(parts)>3 and parts[1]=='puppets':keep='/'.join(parts[3:]) in allowed.get(parts[2],set())
  else:keep=path.suffix.lower() in {'.html','.js','.css','.svg','.woff','.woff2','.ttf','.otf','.png','.txt'} or rel.as_posix() in {'wwwroot/accessories/catalog.json','wwwroot/source-capabilities.json'}
 if keep:copy(path)
 else:omitted+=1
(target/'Sonidos').mkdir();shutil.copy2(root/'Sonidos/LEEME.txt',target/'Sonidos/LEEME.txt')
(target/'LEEME.txt').write_text("""VTUBER & FRIENDS - WINDOWS x64
1. Extrae/copia esta carpeta completa a una carpeta donde puedas guardar cambios.
2. Abre VtuberFriends.exe. No necesitas instalar .NET ni ejecutar PowerShell.
3. En Configuracion introduce tu token, ID de servidor e ID del canal de voz.
   Crea e invita un bot oficial desde Discord Developer Portal. Dale Ver canales y Conectar.
4. Guardar y conectar. El token se cifra para tu usuario de Windows y no se incluye en este paquete.
5. Asigna invitados por ID, elige Puppet y copia sus fuentes a Streamlabs: 1440x1080 HD, o800x600 para menor consumo.
6. Copia audios a Sonidos y pulsa Actualizar biblioteca en el panel.
7. Configuracion > Cerrar aplicacion termina el receptor. La X del ultimo panel tambien termina el receptor; minimizar mantiene las fuentes funcionando.
La primera ejecucion crea config.json y .local en ESTA carpeta; conserva esos datos para tus siguientes sesiones.
Los amigos usan Discord habitual. No necesitan instalar esta aplicacion.
Mantener todas las DLL, wwwroot y native junto al ejecutable. El panel utiliza Edge de Windows o tu navegador predeterminado.
No se incluyen tokens, servidor/canal personal, usuarios asignados, logs ni sonidos personales del desarrollador.
""",encoding='utf-8')
# Audit output without exposing any contents.
for path in target.rglob('*'):
 if path.is_file() and ('.local' in path.parts or path.suffix in {'.pdb','.ps1','.md','.dpapi','.cs'} or path.name=='config.json'):raise RuntimeError('Unexpected private/development file: '+path.name)
print(json.dumps({'directory':str(target),'runtimeFiles':count,'excludedFiles':omitted,'bytes':sum(p.stat().st_size for p in target.rglob('*') if p.is_file())},ensure_ascii=False))
