"""Measure a vehicle or trailer drop for registration: wheel circles, wheel sprite pivot, body
outline and centroid, plus a preview composite (wheels scaled into place, body with the arches cut
out on top) to check the fit by eye.

The road wheels are found as the pixels present in the master but missing from the body. Each
connected blob is one visible tire; a circle is fitted to it.

    uv run --with pillow python tools/art/measure-vehicle.py <folder> [--master F] [--body F] [--wheel F] [--preview out.png]

Prints JSON. Default file names are the AGENTS.md ones (vehicle-master-v1 / body-v1 / wheel-v1,
or trailer-master-v1 / trailer-body-v1 for trailers).
"""
import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageChops, ImageFilter

args = sys.argv[1:]
folder = Path(args[0]); src = folder / 'source'
opt = lambda name, default: args[args.index(name) + 1] if name in args else default
trailer = (src / 'trailer-master-v1.png').exists()
master = Image.open(src / opt('--master', 'trailer-master-v1.png' if trailer else 'vehicle-master-v1.png')).convert('RGBA')
body = Image.open(src / opt('--body', 'trailer-body-v1.png' if trailer else 'body-v1.png')).convert('RGBA')
wheel = Image.open(src / opt('--wheel', 'wheel-v1.png')).convert('RGBA')
assert master.size == body.size, f'master {master.size} and body {body.size} differ'
W, H = body.size

# wheel pixels: opaque in the master, transparent in the body
ma, ba = master.getchannel('A'), body.getchannel('A')
diff = ImageChops.subtract(ma.point(lambda a: 255 if a > 128 else 0), ba.point(lambda a: 255 if a > 40 else 0))
diff = diff.filter(ImageFilter.MinFilter(5)).filter(ImageFilter.MaxFilter(5))
px = diff.load()
seen = set(); blobs = []
for y in range(0, H, 2):
    for x in range(0, W, 2):
        if px[x, y] and (x, y) not in seen:
            stack = [(x, y)]; seen.add((x, y)); pts = []
            while stack:
                cx, cy = stack.pop(); pts.append((cx, cy))
                for nx, ny in ((cx + 2, cy), (cx - 2, cy), (cx, cy + 2), (cx, cy - 2)):
                    if 0 <= nx < W and 0 <= ny < H and px[nx, ny] and (nx, ny) not in seen:
                        seen.add((nx, ny)); stack.append((nx, ny))
            if len(pts) > 2000: blobs.append(pts)

def circle(pts):
    # tire silhouette: horizontal extent gives the diameter; centre from the extremes
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    x0, x1, y1 = min(xs), max(xs), max(ys)
    r = (x1 - x0) / 2
    return {'x': round((x0 + x1) / 2), 'y': round(y1 - r), 'r': round(r), 'bbox': [x0, min(ys), x1, y1], 'pixels': len(pts) * 4}

wheels = sorted((circle(b) for b in blobs), key=lambda c: -c['x'])   # front (right) first
wa = wheel.getchannel('A').point(lambda a: 255 if a > 96 else 0).getbbox()
wheel_info = {'size': wheel.size, 'pivot': [round((wa[0] + wa[2]) / 2), round((wa[1] + wa[3]) / 2)], 'artRadius': round(max(wa[2] - wa[0], wa[3] - wa[1]) / 2)}

bbox = ba.point(lambda a: 255 if a > 40 else 0).getbbox()
bpx = ba.load()
tops = []
for x in range(bbox[0], bbox[2], 8):
    t = next((y for y in range(H) if bpx[x, y] > 40), None)
    b = next((y for y in range(H - 1, -1, -1) if bpx[x, y] > 40), None)
    tops.append([x, t, b])
sx = sy = n = 0
for y in range(0, H, 4):
    for x in range(0, W, 4):
        if bpx[x, y] > 128: sx += x; sy += y; n += 1
out = {'size': [W, H], 'kind': 'trailer' if trailer else 'vehicle', 'wheels': wheels, 'wheel': wheel_info, 'bodyBBox': bbox,
       'centroid': [round(sx / n), round(sy / n)], 'columns': tops}
print(json.dumps(out))

preview = opt('--preview', None)
if preview:
    bg = Image.new('RGBA', (W, H), (70, 150, 200, 255))
    over = body.copy(); od = ImageDraw.Draw(mask := Image.new('L', (W, H), 255))
    for c in wheels:
        k = c['r'] / wheel_info['artRadius']
        ws = wheel.resize((round(wheel.width * k), round(wheel.height * k)), Image.LANCZOS)
        bg.alpha_composite(ws, (round(c['x'] - wheel_info['pivot'][0] * k), round(c['y'] - wheel_info['pivot'][1] * k)))
    bg.alpha_composite(body)
    for c in wheels:
        k = c['r'] / wheel_info['artRadius']
        ws = wheel.resize((round(wheel.width * k), round(wheel.height * k)), Image.LANCZOS)
        bg.alpha_composite(ws, (round(c['x'] - wheel_info['pivot'][0] * k), round(c['y'] - wheel_info['pivot'][1] * k)))
        od.ellipse([c['x'] - c['r'] * 1.08, c['y'] - c['r'] * 1.08, c['x'] + c['r'] * 1.08, c['y'] + c['r'] * 1.08], fill=0)
    over.putalpha(ImageChops.multiply(over.getchannel('A'), mask))
    bg.alpha_composite(over)
    d = ImageDraw.Draw(bg)
    for c in wheels: d.ellipse([c['x'] - c['r'], c['y'] - c['r'], c['x'] + c['r'], c['y'] + c['r']], outline=(255, 0, 0, 255), width=2)
    bg.save(preview)
