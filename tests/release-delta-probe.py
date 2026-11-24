"""Exercise the previous public ZIP and its installed updater using synthetic settings."""
from pathlib import Path
import argparse, tempfile, zipfile, subprocess, json, urllib.request, time, shutil
p=argparse.ArgumentParser();p.add_argument('--base-zip',required=True);p.add_argument('--patch',required=True);a=p.parse_args()
work=Path(tempfile.mkdtemp(prefix='vf-public-delta-'));port=17875;url=f'http://127.0.0.1:{port}'
with zipfile.ZipFile(a.base_zip) as z:z.extractall(work)
app=work/'app';data=work/'.local';data.mkdir();config=work/'config.json';config.write_text('{"Port":17861}')
(data/'bot-token.dpapi').write_bytes(b'SYNTHETIC_TOKEN');(work/'Sonidos/personal.wav').write_bytes(b'SYNTHETIC_SOUND')
def request(path,body=None,method=None):
 req=urllib.request.Request(url+path,data=None if body is None else json.dumps(body).encode(),method=method,headers={'X-VF-Panel':'1','Content-Type':'application/json'})
 with urllib.request.urlopen(req,timeout=10) as response:return json.load(response)
def start():
 process=subprocess.Popen([str(app/'VtuberFriends.exe'),'--demo','--no-panel','--port',str(port),'--data-dir',str(data)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 for _ in range(100):
  try:request('/api/state');return process
  except OSError:time.sleep(.1)
 process.kill();raise AssertionError('Synthetic app did not start')
def stop(process):
 try:urllib.request.urlopen(urllib.request.Request(url+'/api/app/exit',data=b'',method='POST',headers={'X-VF-Panel':'1'}),timeout=5);process.wait(timeout=10)
 finally:
  if process.poll() is None:process.kill();process.wait()
try:
 process=start()
 try:
  for i in range(7):
   request('/api/slots',{},'POST');slot=request('/api/state')['slots'][-1]
   slot.update(userId=str(123456789012345670+i),enabled=True,opacity=.55+i*.05,thresholdDb=-65+i,avatar='cyan-puppet',nameSize=18+i,puppetPadding=250+i*10,accessoryGlasses='sun')
   request('/api/slots/'+str(slot['id']),slot,'PUT')
  before=request('/api/state')['slots'];assert len(before)==7
 finally:stop(process)
 shutil.copy2(data/'demo-avatars.json',data/'avatars.json')
 private=[config,data/'avatars.json',data/'demo-avatars.json',data/'bot-token.dpapi',work/'Sonidos/personal.wav'];saved={f:f.read_bytes() for f in private}
 stage=app/'.updates/staged/public-probe';stage.mkdir(parents=True)
 with zipfile.ZipFile(a.patch) as z:z.extractall(stage)
 args=[str(app/'Aplicar parche.exe'),'--quiet','--root',str(app),'--package-root',str(stage)]
 subprocess.run([*args,'--dry-run'],check=True,timeout=30);subprocess.run(args,check=True,timeout=30)
 assert all(f.read_bytes()==v for f,v in saved.items())
 process=start()
 try:
  assert request('/api/state')['slots']==before,'Avatar settings changed'
  # If the new release includes onboarding, an update must not interrupt an existing setup.
  try:assert request('/api/setup-wizard')['shouldAutoOpen'] is False
  except urllib.error.HTTPError as error:
   if error.code!=404:raise
  for row in before:
   with urllib.request.urlopen(url+'/overlay/'+str(row['id'])) as response:assert response.status==200
 finally:stop(process)
 assert all(f.read_bytes()==v for f,v in saved.items())
 subprocess.run([*args,'--rollback'],check=True,timeout=30)
 process=start()
 try:assert request('/api/state')['slots']==before
 finally:stop(process)
 assert all(f.read_bytes()==v for f,v in saved.items())
 print('PASS: previous public ZIP, seven full source settings/URLs, apply/dry-run/restore, byte-identical private files. Synthetic demo; no Discord/browser.')
finally:shutil.rmtree(work)
