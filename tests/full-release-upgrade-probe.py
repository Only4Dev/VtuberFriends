"""Full ZIP overlay over an old flat installation; only synthetic settings."""
from pathlib import Path
import zipfile,tempfile,subprocess,json,urllib.request,time,shutil
r=Path(__file__).resolve().parents[1];work=Path(tempfile.mkdtemp(prefix='vf-full-upgrade-'));target=work/'VtuberFriends';port=17878;url=f'http://127.0.0.1:{port}'
def request(path,body=None,method=None):
 req=urllib.request.Request(url+path,data=None if body is None else json.dumps(body).encode(),method=method,headers={'X-VF-Panel':'1','Content-Type':'application/json'})
 with urllib.request.urlopen(req,timeout=5) as response:return json.load(response)
def start():
 process=subprocess.Popen([str(target/'VtuberFriends.exe'),'--demo','--no-panel','--port',str(port)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 for _ in range(100):
  try:request('/api/state');return process
  except OSError:time.sleep(.1)
 raise AssertionError('Startup failed')
def stop(process):
 urllib.request.urlopen(urllib.request.Request(url+'/api/app/exit',data=b'',method='POST',headers={'X-VF-Panel':'1'}),timeout=5)
 # The organized native launcher exits early; wait for the server too.
 process.wait(timeout=10)
 for _ in range(100):
  try:request('/api/state');time.sleep(.1)
  except OSError:return
 raise AssertionError('Receiver did not stop')
try:
 with zipfile.ZipFile(r/'Distribucion/VtuberFriends-Windows-x64.zip') as z:z.extractall(work)
 with zipfile.ZipFile(r/'Distribucion/Parches/vf-20261121-audio-base-05.zip') as z:z.extractall(target)
 subprocess.run([str(target/'Aplicar parche.exe'),'--quiet'],check=True,timeout=30)
 data=target/'.local';data.mkdir();(target/'config.json').write_text('{"Port":17861}')
 (data/'bot-token.dpapi').write_bytes(b'SYNTHETIC_TOKEN');(target/'Sonidos/personal.wav').write_bytes(b'SYNTHETIC_SOUND')
 process=start()
 try:
  for i,slot in enumerate(request('/api/state')['slots']):
   slot.update(userId=str(123456789012345670+i),enabled=True,opacity=.55+i*.05,thresholdDb=-65+i,avatar='cyan-puppet',accessoryGlasses='sun',accessoryEdits={'cyan-dragon:glasses-sun':{'x':i*3,'y':-i,'scale':.8,'rotation':i*4}})
   request('/api/slots/'+str(slot['id']),slot,'PUT')
  before=request('/api/state')['slots'];assert len(before)==8
 finally:stop(process)
 shutil.copy2(data/'demo-avatars.json',data/'avatars.json')
 protected=[target/'config.json',data/'avatars.json',data/'demo-avatars.json',data/'bot-token.dpapi',target/'Sonidos/personal.wav'];saved={p:p.read_bytes() for p in protected}
 info=json.loads((r/'artifacts/organized-release.json').read_text())
 with zipfile.ZipFile(info['zip']) as z:
  assert not any(n=='config.json' or n.startswith('.local/') for n in z.namelist())
  z.extractall(target)
 assert all(p.read_bytes()==v for p,v in saved.items())
 process=start()
 try:
  assert request('/api/state')['slots']==before
  assert request('/api/updates')['version']==__import__('re').search(r'Version="([0-9.]+)"',(r/'src/VtuberFriends/UpdateService.cs').read_text(encoding='utf-8')).group(1)
  for slot in before:
   with urllib.request.urlopen(url+'/overlay/'+str(slot['id'])) as response:assert response.status==200
 finally:stop(process)
 assert all(p.read_bytes()==v for p,v in saved.items())
 print('PASS: full release ZIP extracted directly over old flat app; root launcher finds existing settings, all eight profiles/URLs preserved, config/token/sounds byte-identical. No incorporation patch, real credentials, Discord or browser.')
finally:shutil.rmtree(work)
