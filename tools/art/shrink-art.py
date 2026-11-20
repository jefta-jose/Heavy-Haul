"""Shrink every car's runtime art to what the camera can show, so the app downloads, decodes and holds less on phones.

Each vehicle is framed at one fixed zoom (zoomFor in src/game/view.js), so the most screen pixels per metre any of its
art can reach is TARGET_PX_PER_M / zoom (TARGET_PX_PER_M covers phones, tablets and a 1440 px desktop at the 1.5 pixel
density cap, with a margin). Bodies and wheels larger than that are resized down; their original size is recorded as
`art.body.sourceSize` / `art.wheel.sourceSize`, so every rig measurement (bodyOrigin, pixelsPerMetre, archCircles,
wheelPivot, wheelArtRadius) stays in the pixels it was measured in and the game draws them exactly as before.
Masters (the garage cards) are re-encoded at MASTER_QUALITY. Run it again after hooking up new cars; it is idempotent.

    uv run --with pillow python tools/art/shrink-art.py [--dry]
"""
import json
import sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
TARGET_PX_PER_M = 200      # screen pixels per metre at zoom 1 on the densest screen we size for (see the docstring)
MARGIN = 1.15              # head room over that, so nothing is ever drawn upscaled
QUALITY = 90               # bodies and wheels
MASTER_QUALITY = 85        # garage cards (kept 1000 px wide)
# camera numbers mirrored from src/game-config.js and src/game/view.js (FRAMING)
CAMERA_HEIGHT_SHARE, CAMERA_LENGTH_SHARE, CAMERA_MIN_ZOOM = 0.27, 0.72, 1.55
FRAME_W, FRAME_H = 11.8, 6.0
dry = '--dry' in sys.argv


def zoom_for(car):
    rig, size = car['rig'], car.get('physics', {}).get('size')
    length = size[0] if size else rig['nose'] - (min(rig['axles']) - rig['radius'])
    height = size[1] if size else 2.5
    z = max(CAMERA_MIN_ZOOM, height / (CAMERA_HEIGHT_SHARE * FRAME_H), length / (CAMERA_LENGTH_SHARE * FRAME_W))
    return round(min(5, z) * 100) / 100


def resize_to(path, size, quality):
    with Image.open(path) as im:
        im = im.convert('RGBA').resize(size, Image.LANCZOS)
        if not dry:
            tmp = path.with_suffix('.webp.tmp'); im.save(tmp, 'WEBP', quality=quality, method=6); tmp.replace(path)


cars = []
for spec in sorted(ROOT.glob('assets/cars/*/car.json')):
    data = json.loads(spec.read_text())
    if data.get('status') == 'playable' or data.get('role'):
        cars.append((spec, data))

before = after = 0
wheels = {}   # wheel file -> (source size, largest pixel size any user needs)
for spec, car in cars:
    folder, art, rig = spec.parent, car['art'], car['rig']
    px_per_m = TARGET_PX_PER_M / zoom_for(car) * MARGIN
    # body: the rig's own pixels per metre against what the screen can show
    body = folder / art['body']['file']
    if body.exists():
        with Image.open(body) as im: cur = im.size
        src = art['body'].get('sourceSize', list(cur))
        scale = min(1, px_per_m / rig['pixelsPerMetre'])
        want = (max(1, round(src[0] * scale)), max(1, round(src[1] * scale)))
        if want[0] < cur[0] * 0.92:
            b0 = body.stat().st_size; resize_to(body, want, QUALITY)
            art['body']['sourceSize'] = src
            before += b0; after += body.stat().st_size if not dry else b0 * (want[0] * want[1]) / (cur[0] * cur[1])
    # wheel: shared files are sized for the user that draws them biggest
    wheel = (folder / art['wheel']['file']).resolve()
    if wheel.exists():
        with Image.open(wheel) as im: cur = im.size
        src = art['wheel'].get('sourceSize', list(cur))
        radius = rig['radius'] * max([1] + rig.get('wheelScale', []))
        need = radius / rig['wheelArtRadius'] * px_per_m * src[0]   # file width that draws this tyre at full detail
        old = wheels.get(wheel)
        wheels[wheel] = (src if not old else old[0], max(need, old[1] if old else 0), (old[2] if old else []) + [spec])
    if not dry:
        spec.write_text(json.dumps(car, indent=2, ensure_ascii=False) + '\n')

for wheel, (src, need, users) in wheels.items():
    with Image.open(wheel) as im: cur = im.size
    w = min(cur[0], max(128, round(need)))
    if w < cur[0] * 0.92:
        b0 = wheel.stat().st_size; resize_to(wheel, (w, round(w * cur[1] / cur[0])), QUALITY)
        before += b0; after += wheel.stat().st_size if not dry else b0 * (w / cur[0]) ** 2
        for spec in users:   # record the size the pivot and radius were measured in
            car = json.loads(spec.read_text())
            if 'sourceSize' not in car['art']['wheel']:
                car['art']['wheel']['sourceSize'] = list(src)
                if not dry: spec.write_text(json.dumps(car, indent=2, ensure_ascii=False) + '\n')

for spec, _ in cars:
    car = json.loads(spec.read_text()) if not dry else _   # re-read: the wheel pass may have added sourceSize
    master = spec.parent / car['art']['master']['file']
    if master.exists() and car['art']['master'].get('quality') != MASTER_QUALITY:
        b0 = master.stat().st_size
        with Image.open(master) as im:
            if not dry:
                tmp = master.with_suffix('.webp.tmp'); im.save(tmp, 'WEBP', quality=MASTER_QUALITY, method=6); tmp.replace(master)
        car['art']['master']['quality'] = MASTER_QUALITY
        if not dry: spec.write_text(json.dumps(car, indent=2, ensure_ascii=False) + '\n')
        before += b0; after += master.stat().st_size if not dry else b0 * 0.6

print(f'{"would shrink" if dry else "shrank"} {before / 1e6:.1f} MB to {after / 1e6:.1f} MB')
