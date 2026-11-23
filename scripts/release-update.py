"""Create GitHub asset name keyed to the exact before-DLL. Upload to a newer GitHub Release."""
from pathlib import Path
import argparse,json,shutil
p=argparse.ArgumentParser();p.add_argument('patch');a=p.parse_args()
root=Path(__file__).resolve().parents[1];folder=root/'Distribucion/Parches'/a.patch
m=json.loads((folder/'_patch/manifest.json').read_text(encoding='utf-8'))
base=next(f['before'] for f in m['files'] if f['path']=='VtuberFriends.dll')
if not base:raise ValueError('A before DLL hash is required')
out=folder.parent/('vf-update-'+base[:12]+'.zip');shutil.copy2(folder.with_suffix('.zip'),out);print(out)
