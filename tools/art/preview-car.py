"""Composite a car exactly as the game draws it at rest, from its car.json registration: far
wheels, body, near wheels, then the body with the arch circles cut out. Use it to check the wheel
fit before playing.

    uv run --with pillow python tools/art/preview-car.py assets/cars/<id> out.png [--marks]

--marks outlines the physical tire circles in red and the arch cut-outs in yellow.
"""
import json
import sys
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw

folder, out = Path(sys.argv[1]), sys.argv[2]
car = json.loads((folder / 'car.json').read_text())
rig = car['rig']
body = Image.open(folder / car['art']['body']['source']).convert('RGBA')
wheel = Image.open(folder / car['art']['wheel']['source']).convert('RGBA')
ppm, (ox, oy) = rig['pixelsPerMetre'], rig['bodyOrigin']
scales = rig.get('wheelScale') or [1] * len(rig['axles'])
def sprites(scale):
    k = rig['radius'] * scale * ppm / rig['wheelArtRadius']
    ws = wheel.resize((round(wheel.width * k), round(wheel.height * k)), Image.LANCZOS)
    far = ws.copy(); far.alpha_composite(Image.new('RGBA', far.size, (10, 12, 8, 102))); far.putalpha(ws.getchannel('A'))
    return k, ws, far
hubs = [(ox + ax * ppm, oy - wy * ppm, sc) for ax, wy, sc in zip(rig['axles'], rig['wheelY'], scales)]
pad = 40
canvas = Image.new('RGBA', (body.width + 2 * pad, body.height + 2 * pad), (70, 150, 200, 255))
paste = lambda im, x, y: canvas.alpha_composite(im, (round(x + pad), round(y + pad)))
fx, fy = (v * ppm for v in rig.get('farWheelOffset', [0, 0]))
for hx, hy, sc in hubs: k, ws, far = sprites(sc); paste(far, hx + fx - rig['wheelPivot'][0] * k, hy - fy - rig['wheelPivot'][1] * k)
paste(body, 0, 0)
for hx, hy, sc in hubs: k, ws, far = sprites(sc); paste(ws, hx - rig['wheelPivot'][0] * k, hy - rig['wheelPivot'][1] * k)
mask = Image.new('L', body.size, 255); md = ImageDraw.Draw(mask)
for x, y, r in rig['archCircles']: md.ellipse([x - r, y - r, x + r, y + r], fill=0)
over = body.copy(); over.putalpha(ImageChops.multiply(body.getchannel('A'), mask)); paste(over, 0, 0)
if '--marks' in sys.argv:
    d = ImageDraw.Draw(canvas)
    for hx, hy, sc in hubs:
        r_px = rig['radius'] * sc * ppm
        d.ellipse([hx - r_px + pad, hy - r_px + pad, hx + r_px + pad, hy + r_px + pad], outline=(255, 0, 0, 255), width=2)
    for x, y, r in rig['archCircles']: d.ellipse([x - r + pad, y - r + pad, x + r + pad, y + r + pad], outline=(255, 230, 0, 255), width=1)
canvas.save(out)
