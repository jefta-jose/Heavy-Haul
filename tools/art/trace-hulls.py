"""Trace collision hulls for a season's rock sprites into rock-hulls.json.

Each sprite's opaque pixels are reduced to a convex hull of at most 8 points (Box2D's polygon
limit is 8), in the sprite's own pixel space: {k, w, h, top, hull}. Physics scales them to size.

    uv run --with pillow python tools/art/trace-hulls.py assets/seasons/<id>/source/rock-v1.png [...] > hulls.json
"""
import json
import sys
from PIL import Image


def convex_hull(points):
    pts = sorted(set(points))
    cross = lambda o, a, b: (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lower, upper = [], []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0: lower.pop()
        lower.append(p)
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0: upper.pop()
        upper.append(p)
    return lower[:-1] + upper[:-1]


def reduce(hull, n=8):
    # drop the vertex that removes the least area until n remain
    area = lambda a, b, c: abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]))
    while len(hull) > n:
        i = min(range(len(hull)), key=lambda i: area(hull[i - 1], hull[i], hull[(i + 1) % len(hull)]))
        hull.pop(i)
    return hull


out = []
for i, path in enumerate(sys.argv[1:]):
    im = Image.open(path).convert('RGBA')
    box = im.getchannel('A').point(lambda a: 255 if a > 96 else 0).getbbox()
    crop = im.crop(box)
    w, h = crop.size
    step = max(1, w // 200)
    a = crop.getchannel('A').load()
    pts = [(x, y) for y in range(0, h, step) for x in range(0, w, step) if a[x, y] > 96]
    hull = reduce(convex_hull(pts))
    out.append({'k': f'rock{i}', 'w': w, 'h': h, 'top': min(y for _, y in hull), 'hull': [list(p) for p in hull]})
print(json.dumps(out, indent=1))
