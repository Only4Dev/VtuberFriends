import zipfile
"""Roundtrip seven configured sources through the old/new applications, not only file sentinels."""
import pathlib,shutil,tempfile,subprocess,json,urllib.request,time,socket,contextlib,hashlib
import argparse
parser=argparse.ArgumentParser();parser.add_argument('--patch',default='vf-20261120-hacker-01');parser.add_argument('--base-patch');parser.add_argument('--feature',choices=['hacker','test-mode','sources-8','close'],default='hacker');args=parser.parse_args()
root=pathlib.Path(__file__).resolve().parents[1];work=pathlib.Path(tempfile.mkdtemp(prefix='vf-configured-patch-'));target=work/'VtuberFriends';
with zipfile.ZipFile(root/'Distribucion/VtuberFriends-Windows-x64.zip') as archive:
 assert not any('/.local/' in n or n.endswith('/config.json') or '..' in pathlib.Path(n).parts for n in archive.namelist())
 archive.extractall(work)
if args.base_patch:
 with zipfile.ZipFile(root/'Distribucion/Parches'/(args.base_patch+'.zip')) as archive:archive.extractall(target)
 result=subprocess.run([str(target/'Aplicar parche.exe'),'--quiet'],capture_output=True,text=True,timeout=30);assert result.returncode==0,result.stdout
shutil.copytree(root/'Distribucion/Parches'/args.patch,target,dirs_exist_ok=True)
port=17867;url=f'http://127.0.0.1:{port}';data=target/'.local';data.mkdir();(target/'config.json').write_text(json.dumps({'Port':17861,'GuildId':'644060504733646850','ChannelId':'1216140844323569675'}));(data/'bot-token.dpapi').write_bytes(b'SYNTHETIC_TOKEN_SENTINEL');(target/'Sonidos/personal.wav').write_bytes(b'SYNTHETIC_SOUND');streamlabs=work/'external-streamlabs-scenes.json';streamlabs.write_text(json.dumps([{'url':f'http://127.0.0.1:17861/overlay/{i}','width':1440,'height':1080,'x':i*25,'y':i*17,'scale':.33} for i in range(1,8)]))
def request(path,body=None,method=None):
 req=urllib.request.Request(url+path,data=json.dumps(body).encode() if body is not None else None,method=method,headers={'Content-Type':'application/json','X-VF-Panel':'1'})
 with urllib.request.urlopen(req) as response:return json.load(response)
@contextlib.contextmanager
def server():
 with socket.socket() as check:check.bind(('127.0.0.1',port))
 app=subprocess.Popen([str(target/'VtuberFriends.exe'),'--demo','--port',str(port),'--data-dir',str(data)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 try:
  for _ in range(100):
   try:request('/api/state');break
   except OSError:time.sleep(.1)
  else:raise AssertionError('server did not start')
  yield
 finally:
  try:urllib.request.urlopen(urllib.request.Request(url+'/api/app/exit',data=b'',method='POST',headers={'X-VF-Panel':'1'}));app.wait(timeout=10)
  except Exception:
   if app.poll() is None:app.kill();app.wait()
def run(*args):
 p=subprocess.run([str(target/'Aplicar parche.exe'),'--quiet',*args],capture_output=True,text=True,timeout=30);assert p.returncode==0,(p.returncode,p.stdout,p.stderr)
models=['cyan','jade','amber','thoxer','ember','patch','rose','frost']
with server():
 for i,slot in enumerate(request('/api/state')['slots']):
  pack=models[i]+'-dragon';slot.update(userId=str(123456789012345670+i),enabled=True,avatar=models[i]+'-puppet',opacity=.51+i*.05,thresholdDb=-61+i,nameStyle='outline',nameSize=18+i,nameOpacity=.75,entryAnimation='hacker' if args.base_patch and i==0 else 'celestial',exitAnimation='pop',entrySound='a'*32+'.wav',entrySoundFile='a'*32+'.wav',entrySoundName='Mi sonido',puppetPadding=250+i*10,puppetMouthTravel=50+i*5,puppetEyeGlow=True,puppetEyeGlowIntensity=.35,accessoryObject='phone',accessoryObjectLeft='microphone',accessoryHat='wizard',ambientEffects=['orbs'],accessoryAura='energy',accessoryEdits={pack+':object-phone':{'x':35+i,'y':-20-i,'scale':.7+i*.1,'rotation':i*7},pack+':effect-aura':{'x':12+i,'y':-30,'scale':1.1,'color':'#77aaff','intensity':.6,'speed':1.2}},puppetParts={'head':{'x':i*3,'y':-i,'scaleX':1.02,'scaleY':.98,'rotation':i}})
  slot['accessoryProfiles']['frost-puppet']={'accessoryGlasses':'sun','objectSpeed':1.7,'puppetPadding':350,'ambientEffects':['runes']}
  request('/api/slots/'+str(i+1),slot,'PUT')
 before=request('/api/state')['slots']
(data/'avatars.json').write_bytes((data/'demo-avatars.json').read_bytes())
protected=[target/'config.json',data/'avatars.json',data/'demo-avatars.json',data/'bot-token.dpapi',target/'Sonidos/personal.wav',streamlabs];hashes={str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in protected}
run()
for p in protected:assert hashlib.sha256(p.read_bytes()).hexdigest()==hashes[str(p)],str(p)
with server():
 after=request('/api/state')['slots'];assert after[:len(before)]==before,'Existing configuration changed on startup'
 if args.feature=='sources-8':assert len(after)==8 and after[7]['id']==8 and not after[7]['enabled'] and after[7]['userId'] is None
 else:assert len(after)==len(before)
 for i in range(1,8):assert urllib.request.urlopen(url+'/overlay/'+str(i)).status==200
 if args.feature=='hacker':
  changed=json.loads(json.dumps(after[0]));changed['entryAnimation']='hacker';saved=request('/api/slots/1',changed,'PUT');assert saved==changed,'Selecting new effect changed unrelated settings'
  request('/api/slots/1',before[0],'PUT')
 else:
  assert request('/api/test-mode',{'enabled':True},'PUT')['enabled'];state=request('/api/state');assert state['testMode'] and state['slots']==after
  for p in protected:assert hashlib.sha256(p.read_bytes()).hexdigest()==hashes[str(p)],str(p)
  assert not request('/api/test-mode',{'enabled':False},'PUT')['enabled'];assert request('/api/state')['slots']==after
if args.feature=='sources-8':
 with server():
  state=request('/api/state');assert state['slots'][:7]==before
  assert urllib.request.urlopen(url+'/overlay/8').status==200
  try:urllib.request.urlopen(url+'/overlay/9');raise AssertionError('source9 exposed')
  except urllib.error.HTTPError as error:assert error.code==404
  eighth=state['slots'][7];eighth.update(userId='888888888888888888',enabled=True,avatar='frost-puppet',opacity=.72)
  saved=request('/api/slots/8',eighth,'PUT');assert saved['id']==8 and saved['avatar']=='frost-puppet';assert request('/api/state')['slots'][:7]==before
 with server():
  state=request('/api/state');assert state['slots'][:7]==before and state['slots'][7]['userId']=='888888888888888888' and state['slots'][7]['opacity']==.72
 # Simulate the production avatars file after the user explicitly saves the eighth source.
 (data/'avatars.json').write_bytes((data/'demo-avatars.json').read_bytes());eight_bytes=(data/'avatars.json').read_bytes()
 rejected=subprocess.run([str(target/'Aplicar parche.exe'),'--quiet','--rollback'],capture_output=True,text=True,timeout=30);assert rejected.returncode==2 and (data/'avatars.json').read_bytes()==eight_bytes
 # Restore ONLY this synthetic fixture to its original seven rows to test code rollback. The updater never does this.
 (data/'avatars.json').write_bytes(json.dumps(before,indent=2).encode());(data/'demo-avatars.json').write_bytes(json.dumps(before,indent=2).encode())
 # Preserve original serialization bytes for the byte-level assertions below.
 original_json=json.dumps(before,indent=2).encode();hashes[str(data/'avatars.json')]=hashlib.sha256(original_json).hexdigest()
run('--rollback')
with server():assert request('/api/state')['slots']==before,'Restoring prior version lost settings'
for p in [target/'config.json',data/'avatars.json',data/'bot-token.dpapi',target/'Sonidos/personal.wav',streamlabs]:assert hashlib.sha256(p.read_bytes()).hexdigest()==hashes[str(p)],str(p)
report={'patch':args.patch,'configuredSources':len(before),'fullSettingsIdenticalAfterPatch':True,'privateFilesByteIdentical':True,'urlsPreserved':True,'requestedFeaturePreservesOtherSettings':True,'testModeDoesNotSaveSettings':args.feature in ['test-mode','sources-8','close'],'eighthSourceAndRollbackGuard':args.feature=='sources-8','priorVersionLoadsSameConfigurationAfterRestore':True,'realDiscordOrStreamlabsTouched':False};(root/('artifacts/'+args.patch+'-settings-audit.json')).write_text(json.dumps(report,indent=2));print('PASS: '+json.dumps(report))
