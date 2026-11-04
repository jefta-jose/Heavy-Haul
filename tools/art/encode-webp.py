"""Encode artwork masters to the runtime WebP files named in every car.json and season.json, plus
the garage / menu art listed in assets/hud/hud.json.

Each "art" entry maps a key to {"file": "art/x.webp", "source": "source/x.png"}. A WebP is
re-encoded only when its source is newer. Dimensions and composition are never changed, unless the
entry asks for it: the loading screens (assets/loaders/loaders.json) set "crop", "width" and "quality"
because they must show at once.

    uv run --with pillow python tools/art/encode-webp.py      (or: npm run art:encode)
"""
import json
import argparse
from pathlib import Path
from PIL import Image
from registration import registered_image

ROOT = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--cars', nargs='+', help='encode only these car IDs')
parser.add_argument('--method', type=int, choices=range(7), default=6, help='WebP encoding effort, 0 fastest to 6 slowest')
args = parser.parse_args()
SPECS = ['assets/cars/*/car.json', 'assets/seasons/*/season.json', 'assets/loaders/loaders.json']
jobs = []
for spec in sorted(p for g in SPECS for p in ROOT.glob(g)):
    if args.cars and (spec.name != 'car.json' or spec.parent.name not in args.cars):
        continue
    for key, entry in json.loads(spec.read_text()).get('art', {}).items():
        jobs.append((spec, key, entry))
hud = ROOT / 'assets/hud/hud.json'
for item in ([] if args.cars else json.loads(hud.read_text()).get('art', [])):
    jobs.append((hud, item['id'], {'source': item['file'], 'file': f"art/{item['id']}.webp", **{k: item[k] for k in ('width', 'quality', 'crop') if k in item}}))
for spec, key, entry in jobs:
    folder = spec.parent
    src, dst = folder / entry['source'], folder / entry['file']
    if not src.exists():
        print(f'not generated yet: {src.relative_to(ROOT)}')
        continue
    if dst.exists() and dst.stat().st_mtime >= max(src.stat().st_mtime, spec.stat().st_mtime):
        continue
    dst.parent.mkdir(parents=True, exist_ok=True)
    tmp = dst.with_suffix('.webp.tmp')   # write then swap, so a build never reads half a file
    with Image.open(src) as image:
        image = registered_image(image, entry)
        if 'crop' in entry:
            image = image.crop(entry['crop'])
        if 'width' in entry and image.width > entry['width']:
            image = image.resize((entry['width'], round(image.height * entry['width'] / image.width)), Image.LANCZOS)
        image.save(tmp, 'WEBP', quality=entry.get('quality', 94), method=args.method)
    tmp.replace(dst)
    print(f'encoded {dst.relative_to(ROOT)}')
