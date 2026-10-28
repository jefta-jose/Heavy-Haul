// Screen-space backdrop: opaque panorama, haze and transparent midground trees, each scrolling
// with its own parallax factor and mirrored at every repeat so no seam shows.

function screenLayer(scene, img, factor, height, bottom, opacity = 1) {
  const { ctx, W, ppm, cam } = scene.view, w = height * img.width / img.height;
  const shift = (cam.x - scene.sim.trail.start) * ppm * factor, origin = W / 2 - w / 2 - shift;
  ctx.globalAlpha = opacity;
  const first = Math.floor(-origin / w) - 1, last = Math.ceil((W - origin) / w);
  for (let i = first; i <= last; i++) {
    const x = origin + i * w;
    if (Math.abs(i % 2) === 1) { ctx.save(); ctx.translate(x + w, bottom - height); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0, w + 1, height); ctx.restore(); }
    else ctx.drawImage(img, x, bottom - height, w + 1, height);
  }
  ctx.globalAlpha = 1;
}

export function drawBackground(scene) {
  const { ctx, W, H, DPR } = scene.view, C = scene.cache, render = scene.season.render;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = render.sky; ctx.fillRect(0, 0, W, H);
  screenLayer(scene, C.img.backdrop, render.parallax.backdrop, H * 1.04, H * 1.02);
  ctx.fillStyle = C.fog; ctx.fillRect(0, 0, W, H);
  // A continuous forest floor behind the bank. The panorama contains water below the roots;
  // it must not become a hole in the trail when the foreground descends or the camera climbs.
  // Draw before the transparent trees so their roots and vegetation soften the far boundary.
  scene.view.worldTransform();
  const [lo, hi] = scene.view.viewX(), bottom = scene.view.cam.y - H / scene.view.ppm;
  // The tree PNG has transparent padding below its roots: their actual baseline is ~0.675 H,
  // not the image's 0.73 H placement. Begin the soil behind that baseline, not below it.
  const horizon = scene.view.cam.y + (H * 0.5 - H * 0.65) / scene.view.ppm;
  ctx.save(); ctx.beginPath();
  for (let x = lo; x <= hi + 0.5; x += 0.5) {
    const y = horizon + Math.sin(x * 0.37) * 0.08 + Math.sin(x * 1.13) * 0.035;
    if (x === lo) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.lineTo(hi + 0.5, bottom); ctx.lineTo(lo, bottom); ctx.closePath(); ctx.clip();
  // Feather the distant floor into the roots instead of revealing a horizontal earthen wall
  // on tall screens. Texture is compressed in depth, as a receding surface should be.
  ctx.fillStyle = C.forestPat;
  const fade = Math.min(0.8, H / scene.view.ppm * 0.03);
  ctx.fillRect(lo, bottom, hi - lo + 0.5, Math.max(0, horizon - fade - bottom));
  for (let i = 0; i < 12; i++) {
    ctx.globalAlpha = (i + 0.5) / 12;
    ctx.fillRect(lo, horizon - fade * (i + 1) / 12, hi - lo + 0.5, fade / 12 + 0.005);
  }
  ctx.globalAlpha = 1;
  const shade = ctx.createLinearGradient(0, horizon, 0, horizon - 3);
  shade.addColorStop(0, 'rgba(64,73,53,0)'); shade.addColorStop(1, 'rgba(29,33,22,0.12)');
  ctx.fillStyle = shade; ctx.fillRect(lo, bottom, hi - lo + 0.5, horizon - bottom + 0.2);
  ctx.restore(); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  screenLayer(scene, C.img.midground, render.parallax.midground, H * 0.55, H * 0.73, 0.72);
}

// Mild foreground shade keeps the wet terrain readable behind the touch controls.
export function drawForegroundShade(scene) {
  const { ctx, W, H, DPR } = scene.view;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.fillStyle = scene.cache.shade; ctx.fillRect(0, H * 0.72, W, H * 0.28);
}
