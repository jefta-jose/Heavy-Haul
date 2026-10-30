"""Draft a car.json `rig` and collision boxes from a vehicle drop, as a starting point for hooking it up.

    uv run --with pillow python tools/art/draft-rig.py <folder> --tire-m 1.05 [--master F] [--body F] [--wheel F] [--hubs x,x,... --hub-y Y --tire-px R]

Takes the tire circles from measure-vehicle.py (or pass --hubs x,x,... with --hub-y and --tire-px,
for tires that touch and merge), sets pixelsPerMetre so the drawn tire
is the roster's tire diameter (--tire-m), and fits each arch circle to the fender's inner edge
(the body edge along rays from 25 to 155 degrees above the hub, upper third, so springs inside
the arch do not count). Collision boxes: one
chassis box the full length at frame height, plus upper boxes following the outline in about 2 m
slices (tops at the 25th percentile so antennas and stacks do not count). Prints JSON; check it
with tools/art/preview-car.py --marks before driving.
"""
import json
import math
import subprocess
import sys
from pathlib import Path
from PIL import Image

args = sys.argv[1:]
folder = Path(args[0]); src = folder / 'source'
opt = lambda name, default=None: args[args.index(name) + 1] if name in args else default
master_name, body_name, wheel_name = opt('--master', 'vehicle-master-v1.png'), opt('--body', 'body-v1.png'), opt('--wheel', 'wheel-v1.png')
master = Image.open(src / master_name).convert('RGBA')
body = Image.open(src / body_name).convert('RGBA')
wheel = Image.open(src / wheel_name).convert('RGBA')
tire_m = float(opt('--tire-m'))
assert master.size == body.size, f'master {master.size} and body {body.size} differ'
W, H = body.size
ba = body.getchannel("A")
bpx = ba.load()

# the wheel sprite: pivot at the centre of its solid tire, art radius to the tread edge
wa = wheel.getchannel('A').point(lambda a: 255 if a > 128 else 0).getbbox()
wheel_pivot = [round((wa[0] + wa[2]) / 2), round((wa[1] + wa[3]) / 2)]
wheel_art_r = round(max(wa[2] - wa[0], wa[3] - wa[1]) / 2)

# tires: the circles measure-vehicle.py fits to the pixels in the master missing from the body (blobs
# much smaller than the tires, such as a spare or a tool, are dropped); or --hubs and --hub-y
if opt('--hubs'):
    hubs = sorted((float(v) for v in opt('--hubs').split(',')), reverse=True)
    hub_y = float(opt('--hub-y')); r_px = float(opt('--tire-px'))
else:
    cmd = [sys.executable, str(Path(__file__).with_name('measure-vehicle.py')), str(folder), '--master', master_name, '--body', body_name, '--wheel', wheel_name]
    wheels = json.loads(subprocess.run(cmd, capture_output=True, text=True, check=True).stdout)['wheels']
    big = max(w['r'] for w in wheels)
    wheels = [w for w in wheels if w['r'] > big * 0.7]
    r_px = sorted(w['r'] for w in wheels)[len(wheels) // 2]
    hub_y = sorted(w['y'] for w in wheels)[len(wheels) // 2]
    hubs = sorted((w['x'] for w in wheels), reverse=True)
ppm = 2 * r_px / tire_m

# the fender's inner edge over each hub
arches = []
for hx in hubs:
    ds = []
    for deg in range(25, 156, 5):
        a = math.radians(deg); dx, dy = math.cos(a), -math.sin(a)
        for d in range(int(r_px * 0.9), int(r_px * 1.8)):
            x, y = int(hx + dx * d), int(hub_y + dy * d)
            if 0 <= x < W and 0 <= y < H and bpx[x, y] > 128:
                ds.append(d); break
    ds.sort()
    arches.append([round(hx), round(hub_y), round(ds[len(ds) * 2 // 3]) if ds else round(r_px * 1.12)])

bb = ba.point(lambda a: 255 if a > 128 else 0).getbbox()
ox = (hubs[0] + hubs[-1]) / 2
m = lambda px: round(px / ppm, 3)
# outline per column (solid pixels only)
col = {}
for x in range(bb[0], bb[2], 4):
    ys = [y for y in range(bb[1], bb[3]) if ba.getpixel((x, y)) > 128]
    if ys: col[x] = (min(ys), max(ys))
tail, nose = (bb[0] - ox) / ppm, (bb[2] - ox) / ppm
# chassis box: frame height, from the lowest body edge clear of the tires
clear = max(0.25 * r_px, min(hub_y - b for x, (t, b) in col.items() if all(abs(x - h) > r_px * 1.05 for h in hubs)))
boxes = [[round(tail, 3), round(nose, 3), m(clear), m(clear + 0.45 * r_px), 0.4]]
n = max(2, round((nose - tail) / 2.2))
for i in range(n):
    x0 = bb[0] + (bb[2] - bb[0]) * i / n; x1 = bb[0] + (bb[2] - bb[0]) * (i + 1) / n
    ts = sorted(t for x, (t, b) in col.items() if x0 <= x < x1)
    if not ts: continue
    top = ts[len(ts) // 4]
    if hub_y - top > clear + 0.5 * r_px:
        boxes.append([m(x0 - ox), m(x1 - ox), m(clear + 0.4 * r_px), m(hub_y - top), 0.4])
print(json.dumps({
    'rig': {
        'bodyOrigin': [round(ox), round(hub_y)], 'pixelsPerMetre': round(ppm, 3),
        'axles': [m(h - ox) for h in hubs], 'wheelY': [0.0] * len(hubs), 'radius': round(tire_m / 2, 3),
        'wheelPivot': wheel_pivot, 'wheelArtRadius': wheel_art_r, 'farWheelOffset': [0.2, 0.13],
        'archCircles': arches, 'nose': round(nose, 3), 'tail': round(tail, 3),
    },
    'bodyBoxes': boxes, 'size': [round(nose - tail, 3), m(hub_y - bb[1])],
    'tirePx': round(r_px, 1),
}))
