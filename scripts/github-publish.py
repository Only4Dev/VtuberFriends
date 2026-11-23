"""Publish audited release assets using the existing Git credential helper.
Credentials remain in memory and are sent only to GitHub's official API/upload hosts.
Never prints credentials, overwrites a public release or force-pushes source history.
"""
from pathlib import Path
import argparse,subprocess,os,json,urllib.request,urllib.error,urllib.parse,http.client,hashlib,zipfile,time
ROOT=Path(__file__).resolve().parents[1];REPO='Only4Dev/VtuberFriends'
p=argparse.ArgumentParser();p.add_argument('action',choices=['ensure-repo','draft','upload','publish','verify']);p.add_argument('--version',default='0.7.0');p.add_argument('--commit');p.add_argument('--asset',action='append',default=[]);a=p.parse_args()
credential=subprocess.run(['git','-c','credential.interactive=never','credential','fill'],input='protocol=https\nhost=github.com\n\n',capture_output=True,text=True,env={**os.environ,'GCM_INTERACTIVE':'never'},timeout=20)
if credential.returncode:raise RuntimeError('No cached GitHub credential. Sign in with GitHub Desktop first.')
values=dict(line.split('=',1) for line in credential.stdout.splitlines() if '=' in line);secret=values.get('password','')
headers={'Authorization':'Bearer '+secret,'User-Agent':'VtuberFriends-release','Accept':'application/vnd.github+json'}
def api(path,data=None,method=None,missing=False):
 req=urllib.request.Request('https://api.github.com'+path,data=None if data is None else json.dumps(data).encode(),headers={**headers,'Content-Type':'application/json'},method=method)
 try:
  with urllib.request.urlopen(req,timeout=40) as r:return json.load(r) if r.status!=204 else None
 except urllib.error.HTTPError as e:
  if missing and e.code==404:return None
  message=json.loads(e.read()).get('message','GitHub request failed');raise RuntimeError('GitHub HTTP '+str(e.code)+': '+message) from None
user=api('/user')
if user['login'].lower()!='only4dev':raise RuntimeError('Authenticated account does not match the authorized owner.')
base='/repos/'+REPO
if a.action=='ensure-repo':
 repo=api(base,missing=True)
 if repo is None:repo=api('/user/repos',{'name':'VtuberFriends','description':'Voice-driven layered 2D avatars for Discord and Streamlabs. Portable Windows app.','private':False,'auto_init':False,'has_wiki':False},'POST')
 if repo['private']:raise RuntimeError('Existing repository is private; refusing to expose existing contents implicitly.')
 print(json.dumps({'repository':repo['html_url'],'private':repo['private']}));raise SystemExit(0)
tag='v'+a.version
release=api(base+'/releases/tags/'+urllib.parse.quote(tag,safe=''),missing=True)
if release is None:
 release=next((r for r in api(base+'/releases?per_page=100') if r['tag_name']==tag),None)
if a.action=='draft':
 if release is None:
  if not a.commit:raise RuntimeError('Exact source commit is required.')
  release=api(base+'/releases',{'tag_name':tag,'target_commitish':a.commit,'name':'Vtuber & Friends '+a.version,'body':(ROOT/'CHANGELOG.md').read_text(encoding='utf-8'),'draft':True,'prerelease':False},'POST')
 if not release['draft']:raise RuntimeError('Release is already public; it was not overwritten.')
 print(json.dumps({'id':release['id'],'tag':release['tag_name'],'draft':True}));raise SystemExit(0)
if release is None:raise RuntimeError('Create the release draft first.')
if a.action=='upload':
 if not release['draft']:raise RuntimeError('Public release assets are immutable in this workflow.')
 for filename in a.asset:
  file=Path(filename).resolve()
  if not file.is_relative_to(ROOT) or not file.is_file():raise RuntimeError('Asset must be an existing workspace file.')
  if file.suffix=='.zip':
   with zipfile.ZipFile(file) as z:
    if z.testzip() is not None:raise RuntimeError('Corrupt ZIP.')
    for name in z.namelist():
     path=Path(name)
     if path.name=='config.json' or any(x in {'.local','source-backups'} for x in path.parts) or path.suffix in {'.dpapi','.pdb','.cs','.ps1'} or ('Sonidos' in path.parts and path.name!='LEEME.txt'):raise RuntimeError('Private/development file in release ZIP: '+name)
  elif file.suffix not in {'.txt','.sha256'}:raise RuntimeError('Unexpected asset type.')
  digest=hashlib.file_digest(file.open('rb'),'sha256').hexdigest();existing=next((x for x in release['assets'] if x['name']==file.name),None)
  if existing:
   if existing.get('digest')=='sha256:'+digest and existing['size']==file.stat().st_size:print('Already uploaded:',file.name,flush=True);continue
   if existing.get('state')=='starter':api(base+'/releases/assets/'+str(existing['id']),method='DELETE')
   else:raise RuntimeError('Draft asset with different contents already exists; not replacing it.')
  parsed=urllib.parse.urlparse(release['upload_url'].split('{')[0]);
  if parsed.scheme!='https' or parsed.hostname!='uploads.github.com':raise RuntimeError('Unexpected upload host.')
  connection=http.client.HTTPSConnection(parsed.hostname,timeout=120);url=parsed.path+'?'+urllib.parse.urlencode({'name':file.name});connection.putrequest('POST',url)
  for k,v in {**headers,'Content-Type':'application/zip' if file.suffix=='.zip' else 'text/plain','Content-Length':str(file.stat().st_size)}.items():connection.putheader(k,v)
  connection.endheaders();sent=0;next_report=16*1024*1024
  with file.open('rb') as stream:
   while chunk:=stream.read(1024*1024):
    connection.send(chunk);sent+=len(chunk)
    if sent>=next_report:print(file.name+': '+str(round(sent/1048576))+' MiB uploaded',flush=True);next_report+=16*1024*1024
  response=connection.getresponse();body=response.read();connection.close()
  if response.status!=201:raise RuntimeError('Asset upload failed: HTTP '+str(response.status))
  asset=json.loads(body)
  if asset.get('digest')!='sha256:'+digest:raise RuntimeError('GitHub asset digest mismatch.')
  print(json.dumps({'asset':asset['name'],'bytes':asset['size'],'sha256':digest}),flush=True)
 print('Draft assets uploaded and verified.');raise SystemExit(0)
if a.action=='publish':
 required={'VtuberFriends-Windows-x64.zip','SHA256SUMS.txt'}
 if not required.issubset({x['name'] for x in release['assets'] if x['state']=='uploaded' and (x.get('digest') or '').startswith('sha256:')}):raise RuntimeError('Required verified assets are missing.')
 if release['draft']:release=api(base+'/releases/'+str(release['id']),{'draft':False},'PATCH')
 print(json.dumps({'release':release['html_url'],'draft':release['draft'],'assets':len(release['assets'])}));raise SystemExit(0)
if a.action=='verify':
 latest=api(base+'/releases/latest');print(json.dumps({'repository':api(base)['html_url'],'private':api(base)['private'],'tag':latest['tag_name'],'release':latest['html_url'],'assets':[{'name':x['name'],'size':x['size'],'digest':x.get('digest')} for x in latest['assets']]}))
