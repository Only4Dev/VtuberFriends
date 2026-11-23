from pathlib import Path
import json,zipfile,tempfile,subprocess,time,hashlib,shutil
root=Path(__file__).resolve().parents[1];info=json.loads((root/'artifacts/organized-release.json').read_text());source=Path(info['directory'])/'app'
work=Path(tempfile.mkdtemp(prefix='vf-staged-update-'));target=work/'app';shutil.copytree(source,target)
# Synthetic files only, no personal installation/token is read.
(work/'.local').mkdir();settings=work/'.local/avatars.json';settings.write_text('[{"id":1,"accessoryAura":"runes"}]')
config=work/'config.json';config.write_text('SYNTHETIC_CONFIG');saved=settings.read_bytes()
stage=target/'.updates/staged/probe';(stage/'_patch/payload/wwwroot').mkdir(parents=True)
payload=b'// synthetic update resource\n';(stage/'_patch/payload/wwwroot/update-probe.js').write_bytes(payload)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
manifest={'format':1,'id':'staged-probe','title':'Synthetic update','base':{n:sha(target/n) for n in ['VtuberFriends.deps.json','VtuberFriends.runtimeconfig.json']},'files':[{'path':'wwwroot/update-probe.js','before':None,'after':hashlib.sha256(payload).hexdigest()}],'previousMaxSlots':8,'addedAccessoryValues':{'accessoryAura':['runes']}}
(stage/'_patch/manifest.json').write_text(json.dumps(manifest))
marker=root/'artifacts/restart-marker.exe'
assert marker.is_file(),'Compile tests/stubs/restart-marker.c first'
shutil.copy2(marker,work/'VtuberFriends.exe')
args=[str(target/'Aplicar parche.exe'),'--quiet','--root',str(target),'--package-root',str(stage)]
subprocess.run([*args,'--dry-run'],check=True,timeout=30)
parent=subprocess.Popen(['python','-c','import time;time.sleep(1)']);start=time.monotonic();subprocess.run([*args,'--wait-pid',str(parent.pid),'--restart'],check=True,timeout=30);assert time.monotonic()-start>.7;parent.wait()
for _ in range(100):
 if (work/'restart-probe.ok').exists():break
 time.sleep(.05)
assert (work/'restart-probe.ok').read_text()=='restarted','root launcher was not restarted'
assert (target/'wwwroot/update-probe.js').read_bytes()==payload
result=subprocess.run([*args,'--rollback'],capture_output=True,timeout=30);assert result.returncode==2,'new aura must block incompatible restore even with data in parent root'
assert settings.read_bytes()==saved and config.read_text()=='SYNTHETIC_CONFIG'
settings.write_text('[{"id":1,"accessoryAura":"none"}]');subprocess.run([*args,'--rollback'],check=True,timeout=30);assert not (target/'wwwroot/update-probe.js').exists()
shutil.rmtree(work)
print('PASS: installed helper validates separate staging, waits for parent exit, applies/backups, restarts root launcher (native marker stub), blocks incompatible aura restore and restores after explicit removal; parent-root config/settings preserved. No browser or Discord.')
