"""CI: full download + exact-base delta. Never downloads or merges a user's configuration."""
from pathlib import Path
import json,zipfile,subprocess,shutil,sys
import hashlib
root=Path(__file__).resolve().parents[1];report=json.loads((root/'artifacts/organized-release.json').read_text());out=root/'artifacts/release-assets';out.mkdir(parents=True,exist_ok=True)
shutil.copy2(report['zip'],out/'VtuberFriends-Windows-x64.zip')
def checksums():
 (out/'SHA256SUMS.txt').write_text(''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+p.name+'\n' for p in sorted(out.glob('*.zip'))),encoding='utf-8')
checksums()
previous=root/'.tools/prior-release';previous.mkdir(parents=True,exist_ok=True)
query=subprocess.run(['gh','api','repos/Only4Dev/VtuberFriends/releases/latest'],capture_output=True,text=True)
if query.returncode:
 if '404' in query.stderr:print('First release: no prior public baseline.');sys.exit(0)
 raise RuntimeError('Could not read prior release; refusing to silently skip a delta')
release=json.loads(query.stdout)
import re
version=re.search(r'const string Version="([0-9.]+)"',(root/'src/VtuberFriends/UpdateService.cs').read_text(encoding='utf-8')).group(1)
if release['tag_name']=='v'+version:
 print('This release is already published; keeping its verified assets unchanged.');sys.exit(0)
subprocess.run(['gh','release','download',release['tag_name'],'--pattern','VtuberFriends-Windows-x64.zip','--dir',str(previous)],check=True)
with zipfile.ZipFile(previous/'VtuberFriends-Windows-x64.zip') as z:z.extractall(previous/'clean')
base=previous/'clean/app';new=Path(report['directory'])/'app'
id='vf-update-'+__import__('datetime').datetime.now().strftime('%Y%m%d%H%M%S')
subprocess.run([sys.executable,'scripts/make-patch.py','--base',str(base),'--new',str(new),'--id',id,'--title','Actualización compatible','--previous-max-slots','64'],check=True)
subprocess.run([sys.executable,'tests/release-delta-probe.py','--base-zip',str(previous/'VtuberFriends-Windows-x64.zip'),'--patch',str(root/'Distribucion/Parches'/(id+'.zip'))],check=True)
subprocess.run([sys.executable,'scripts/release-update.py',id],check=True)
manifest=json.loads((root/'Distribucion/Parches'/id/'_patch/manifest.json').read_text(encoding='utf-8'));hash=next(f['before'] for f in manifest['files'] if f['path']=='VtuberFriends.dll')
shutil.copy2(root/'Distribucion/Parches'/('vf-update-'+hash[:12]+'.zip'),out)
checksums()
