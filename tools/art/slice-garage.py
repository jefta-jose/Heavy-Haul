"""Cut the garage art drop (assets/garage-v2, some images hold several items) into one master per item in
assets/hud/source/, with stray specks removed and the margins cropped, then list them in assets/hud/hud.json.
Then run: npm run art:encode

    uv run --with pillow --with numpy --with scipy python tools/art/slice-garage.py
"""
import json
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
DROP, OUT = ROOT / 'assets/garage-v2', ROOT / 'assets/hud/source'
# file in the drop -> the names of its items, left to right; "width" is the size the game needs
SHEETS = {   # None: an item on the sheet that the game does not use
    'Gold Tire Coin, Padlock, and Wrench Icons.png': (['g2-coin', None, None], 200),
    'Turbo Engine, Coilover, Gauge & Mud Tire Icons.png': (['g2-icon-engine', 'g2-icon-suspension', 'g2-icon-speed', 'g2-icon-grip'], 240),
    'Glossy Rainbow Button Set.png': (['g2-orb-engine', 'g2-orb-suspension', 'g2-orb-speed', 'g2-orb-grip'], 256),
}
SINGLES = {
    'Comic-Style Golden Impact Burst.png': ('g2-burst', 420), 'Explosive Smoke Cloud with Flying Debris.png': ('g2-wreck', 460),
    'Glossy Golden Trophy with Laurel Wreath.png': ('g2-trophy', 460),
}

def parts(im):
    """Each object in the image, left to right, largest ones only: specks and halo crumbs are dropped."""
    a = np.array(im.getchannel('A')) > 24
    labels, n = ndimage.label(ndimage.binary_dilation(a, iterations=3))
    sizes = ndimage.sum(a, labels, range(1, n + 1)); boxes = ndimage.find_objects(labels)
    return labels, [(i + 1, boxes[i]) for i in range(n) if sizes[i] > a.sum() * 0.01]

def clean(im, labels, keep, box):
    """Only that object, with everything else made clear, cropped to its own bounds."""
    y, x = box; px = np.array(im); px[labels != keep, 3] = 0
    return Image.fromarray(px).crop((max(0, x.start), max(0, y.start), x.stop, y.stop))

art = []
OUT.mkdir(exist_ok=True)
for file, (names, width) in SHEETS.items():
    im = Image.open(DROP / file).convert('RGBA'); labels, found = parts(im)
    found.sort(key=lambda f: f[1][1].start)
    if len(found) != len(names): raise SystemExit(f'{file}: found {len(found)} items, expected {len(names)}')
    for name, (keep, box) in zip(names, found):
        if name: clean(im, labels, keep, box).save(OUT / f'{name}.png'); art.append({'id': name, 'file': f'source/{name}.png', 'width': width, 'quality': 90})
for file, (name, width) in SINGLES.items():
    im = Image.open(DROP / file).convert('RGBA')
    labels, found = parts(im)
    keeps = [k for k, _ in found]; px = np.array(im); px[~np.isin(labels, keeps), 3] = 0
    Image.fromarray(px).crop(Image.fromarray(px).getchannel('A').getbbox()).save(OUT / f'{name}.png')
    art.append({'id': name, 'file': f'source/{name}.png', 'width': width, 'quality': 90})

hud_file = ROOT / 'assets/hud/hud.json'; hud = json.loads(hud_file.read_text())
ids = {a['id'] for a in art}
hud['art'] = [a for a in hud['art'] if a['id'] not in ids and a['id'] != 'garage-turntable'] + art
hud_file.write_text(json.dumps(hud, indent=1) + '\n')
print(len(art), 'items')
