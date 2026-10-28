"""Encode artwork masters to the runtime WebP files named in every car.json and season.json, plus
the garage / menu art listed in assets/hud/hud.json.

Each "art" entry maps a key to {"file": "art/x.webp", "source": "source/x.png"}. A WebP is
re-encoded only when its source is newer. Dimensions and composition are never changed.

    uv run --with pillow python tools/art/encode-webp.py      (or: npm run art:encode)
"""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SPECS = ['assets/cars/*/car.json', 'assets/seasons/*/season.json']
jobs = []
for spec in sorted(p for g in SPECS for p in ROOT.glob(g)):
    for key, entry in json.loads(spec.read_text()).get('art', {}).items():
        jobs.append((spec, key, entry))
hud = ROOT / 'assets/hud/hud.json'
for item in json.loads(hud.read_text()).get('art', []):
    jobs.append((hud, item['id'], {'source': item['file'], 'file': f"art/{item['id']}.webp"}))
for spec, key, entry in jobs:
    folder = spec.parent
    src, dst = folder / entry['source'], folder / entry['file']
    if not src.exists():
        print(f'not generated yet: {src.relative_to(ROOT)}')
        continue
    if dst.exists() and dst.stat().st_mtime >= src.stat().st_mtime:
        continue
    dst.parent.mkdir(parents=True, exist_ok=True)
    tmp = dst.with_suffix('.webp.tmp')   # write then swap, so a build never reads half a file
    with Image.open(src) as image:
        image.save(tmp, 'WEBP', quality=94, method=6)
    tmp.replace(dst)
    print(f'encoded {dst.relative_to(ROOT)}')
