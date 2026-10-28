# Usage: uv run --with pillow --with numpy --with scipy python tools/art/ice-breaker-layers.py assets/cars/ice-breaker-19/source/ assets/cars/ice-breaker-19/source
# Ice Breaker load layers, cut from the approved body-v1 with exact registration:
#   orca  = the difference between body-v1 and Codex's (rejected, redrawn) empty-tank body-v2,
#           aligned to body-v1; the orca's own pixels come from body-v1
#   body  = body-v1 with only the orca's area refilled from the aligned empty tank
import sys, numpy as np
from PIL import Image
from scipy import ndimage
d, out = sys.argv[1], sys.argv[2]
a = np.array(Image.open(d + 'body-v1.png').convert('RGBA')).astype(float)
b = np.array(Image.open(d + 'body-v2.png').convert('RGBA').resize((1921, 820), Image.LANCZOS)).astype(float)
H, W = a.shape[:2]; DX, DY = -3, -1
b = b[np.clip(np.arange(H) - DY, 0, b.shape[0] - 1)][:, np.clip(np.arange(W) - DX, 0, b.shape[1] - 1)]
TX0, TY0, TX1, TY1 = 228, 222, 1252, 466
diff = ndimage.uniform_filter(np.abs(a[..., :3] - b[..., :3]).mean(-1), 5)
cand = np.zeros((H, W), bool); cand[226:466, 380:1070] = diff[226:466, 380:1070] > 34
lab, n = ndimage.label(cand); sizes = ndimage.sum(cand, lab, range(1, n + 1))
orca = ndimage.binary_fill_holes(lab == 1 + int(np.argmax(sizes)))
orca = ndimage.binary_opening(ndimage.binary_closing(orca, iterations=3), iterations=2)
ys, xs = np.where(orca); print('orca bounds', xs.min(), ys.min(), xs.max(), ys.max())
din, dout = ndimage.distance_transform_edt(orca), ndimage.distance_transform_edt(~orca)
alpha = np.clip(0.5 + (din - dout) / 1.6, 0, 1)
o = a.copy(); o[..., 3] = alpha * 255
Image.fromarray(o.astype(np.uint8)).save(out + '/orca-v3.png')
# refill: aligned empty tank, colour-matched to body-v1's water around the orca, feathered in
ring = ndimage.binary_dilation(orca, iterations=40) & ~ndimage.binary_dilation(orca, iterations=8)
ring[:TY0 + 30] = False; ring[TY1 - 6:] = False
water = ((a[..., 2] - a[..., 0]) > 48)
ring &= water & ((b[..., 2] - b[..., 0]) > 48)
fill = b[..., :3].copy()
for c in range(3):
    ma, sa = a[..., c][ring].mean(), a[..., c][ring].std(); mb, sb = b[..., c][ring].mean(), b[..., c][ring].std()
    fill[..., c] = (fill[..., c] - mb) * (sa / max(sb, 1)) + ma
zone = ndimage.binary_dilation(orca, iterations=6)
w = np.clip(ndimage.distance_transform_edt(zone) / 6, 0, 1)[..., None]
body = a.copy(); body[..., :3] = a[..., :3] * (1 - w) + fill * w
Image.fromarray(np.clip(body, 0, 255).astype(np.uint8)).save(out + '/body-v3.png')
# tank front: frame posts, straps and bars inside the tank (not water, not orca), from body-v1
tank = np.zeros((H, W), bool); tank[TY0:TY1, TX0:TX1] = True
front = tank & ~water & ~ndimage.binary_dilation(orca, iterations=3) & (a[..., 3] > 200)
front = ndimage.binary_opening(front, iterations=1)
lab, n = ndimage.label(front); sizes = ndimage.sum(front, lab, range(1, n + 1))
front = np.isin(lab, 1 + np.where(sizes > 300)[0])
# only the frame bars, posts and straps: keep the glass air gap out, so the water can slosh up into it
cols = np.zeros(W, bool)
for x0, x1 in [(TX0, 244), (1086, 1124), (1132, TX1)]: cols[x0:x1] = True
rows = np.zeros(H, bool); rows[TY0:229] = True; rows[455:TY1] = True
front &= cols[None, :] | rows[:, None]
f = a.copy(); f[..., 3] = front * 255
Image.fromarray(f.astype(np.uint8)).save(out + '/tank-front-v1.png')
# water surface band, from the empty body, under the frame
band = np.zeros((H, W), bool); band[TY0:292, TX0:TX1] = True; band &= ~front
s = body.copy(); s[..., 3] = band * 255
Image.fromarray(np.clip(s, 0, 255).astype(np.uint8)).save(out + '/water-surface-v2.png')
# check: body-v3 with the orca on top rebuilds body-v1
re = body[..., :3] * (1 - alpha[..., None]) + a[..., :3] * alpha[..., None]
err = np.abs(re - a[..., :3]).mean(-1)
print('rebuild error: mean %.2f, outside the tank %.4f, pixels > 12: %d' % (err.mean(), err[~tank].mean(), (err > 12).sum()))
