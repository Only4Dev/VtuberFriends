import zipfile
import pathlib,shutil,tempfile,subprocess,json,hashlib,urllib.request,time,ctypes
import argparse
parser=argparse.ArgumentParser();parser.add_argument('--patch',default='vf-20261120-hacker-01');parser.add_argument('--base-patch');parser.add_argument('--feature',choices=['hacker','test-mode','sources-8','close'],default='hacker');args=parser.parse_args()
root=pathlib.Path(__file__).resolve().parents[1];base=root/'Distribucion/VtuberFriends';patch=root/'Distribucion/Parches'/args.patch;work=pathlib.Path(tempfile.mkdtemp(prefix='vf-patch-test-'));target=work/'VtuberFriends';
with zipfile.ZipFile(root/'Distribucion/VtuberFriends-Windows-x64.zip') as archive:
 assert not any('/.local/' in n or n.endswith('/config.json') or '..' in pathlib.Path(n).parts for n in archive.namelist())
 archive.extractall(work)
if args.base_patch:
 with zipfile.ZipFile(root/'Distribucion/Parches'/(args.base_patch+'.zip')) as archive:archive.extractall(target)
 result=subprocess.run([str(target/'Aplicar parche.exe'),'--quiet'],capture_output=True,text=True,timeout=30);assert result.returncode==0,result.stdout
shutil.copytree(patch,target,dirs_exist_ok=True)
private={'config.json':b'SYNTHETIC_CONFIG',' .local/avatars.json'.strip():b'[{"id":1,"entryAnimation":"pop","note":"SYNTHETIC_POSITIONS"}]','.local/bot-token.dpapi':b'SYNTHETIC_NOT_A_TOKEN','Sonidos/custom.wav':b'SYNTHETIC_SOUND','wwwroot/accessories/custom.svg':b'SYNTHETIC_CUSTOM_ART'}
for name,value in private.items():p=target/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(value)
manifest_path=target/'_patch/manifest.json';manifest_bytes=manifest_path.read_bytes();manifest=json.loads(manifest_bytes)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def preserved():
 for name,value in private.items():assert (target/name).read_bytes()==value,name

def run(*args,ok=0):
 p=subprocess.run([str(target/'Aplicar parche.exe'),'--quiet',*args],capture_output=True,text=True,timeout=30)
 assert p.returncode==ok,(p.returncode,p.stdout,p.stderr)
 return p.stdout
run('--dry-run');preserved()
changed=next(f for f in manifest['files'] if f['path'].startswith('wwwroot/') and f['before'] is not None);path=target/changed['path'];before=path.read_bytes();path.write_bytes(before+b'\n// synthetic user edit');run('--dry-run',ok=2);assert path.read_bytes().endswith(b'// synthetic user edit');path.write_bytes(before)
payload=target/'_patch/payload'/changed['path'];original=payload.read_bytes();payload.write_bytes(original+b'CORRUPT');run('--dry-run',ok=2);payload.write_bytes(original)
attack=json.loads(manifest_bytes);attack['files'].append({'path':'.local/avatars.json','before':'0'*64,'after':'0'*64});manifest_path.write_text(json.dumps(attack));run('--dry-run',ok=2);manifest_path.write_bytes(manifest_bytes);preserved()
# A Windows share lock on the second file forces failure after the first replacement: rollback must restore it.
kernel=ctypes.WinDLL('kernel32',use_last_error=True);kernel.CreateFileW.argtypes=[ctypes.c_wchar_p,ctypes.c_uint,ctypes.c_uint,ctypes.c_void_p,ctypes.c_uint,ctypes.c_uint,ctypes.c_void_p];kernel.CreateFileW.restype=ctypes.c_void_p;kernel.CloseHandle.argtypes=[ctypes.c_void_p]
handle=kernel.CreateFileW(str(path),0x80000000,1,None,3,128,None);assert handle!=ctypes.c_void_p(-1).value
try:run(ok=2)
finally:kernel.CloseHandle(handle)
for change in manifest['files']:assert (not (target/change['path']).exists()) if change['before'] is None else sha(target/change['path'])==change['before'],'transaction rollback'
run();preserved()
for change in manifest['files']:assert sha(target/change['path'])==change['after']
run();assert len(list((target/'.updates/backups').glob(manifest['id']+'-*/complete')))==1,'idempotence'
# Patched app accepts and persists the new transition. No token or real Discord login.
port=17866;url=f'http://127.0.0.1:{port}'
import socket
with socket.socket() as check:check.bind(('127.0.0.1',port))
app=subprocess.Popen([str(target/'VtuberFriends.exe'),'--demo','--port',str(port),'--data-dir',str(work/'demo')],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
try:
 state=None
 for _ in range(100):
  try:state=json.load(urllib.request.urlopen(url+'/api/state'));break
  except OSError:time.sleep(.1)
 assert state
 if args.feature=='sources-8':assert len(state['slots'])==8 and state['slots'][7]['userId'] is None and not state['slots'][7]['enabled']
 if args.feature=='hacker':
  slot=state['slots'][0];slot.update(entryAnimation='hacker',exitAnimation='hacker')
  req=urllib.request.Request(url+'/api/slots/1',data=json.dumps(slot).encode(),method='PUT',headers={'Content-Type':'application/json','X-VF-Panel':'1'})
  saved=json.load(urllib.request.urlopen(req));assert saved['entryAnimation']=='hacker' and saved['exitAnimation']=='hacker'
 else:
  req=urllib.request.Request(url+'/api/test-mode',data=b'{"enabled":true}',method='PUT',headers={'Content-Type':'application/json','X-VF-Panel':'1'});assert json.load(urllib.request.urlopen(req))['enabled']
 run('--rollback',ok=2)
 urllib.request.urlopen(urllib.request.Request(url+'/api/app/exit',data=b'',method='POST',headers={'X-VF-Panel':'1'}));app.wait(timeout=10)
finally:
 if app.poll() is None:app.kill();app.wait()
if manifest.get('addedAnimations'):
 settings_path=target/'.local/avatars.json';settings_path.write_text('[{"id":1,"entryAnimation":"hacker"}]');run('--rollback',ok=2);assert settings_path.read_text()=='[{"id":1,"entryAnimation":"hacker"}]';settings_path.write_bytes(private['.local/avatars.json'])
run('--rollback');preserved()
for change in manifest['files']:assert (not (target/change['path']).exists()) if change['before'] is None else sha(target/change['path'])==change['before']
print('PASS: compatible delta, wrong version/payload/private-path rejection, interrupted apply rollback, idempotence, preserved settings/token/sounds/custom art, active-app guard, requested-feature HTTP verification and guarded restore. Synthetic isolated copy: '+str(work))
