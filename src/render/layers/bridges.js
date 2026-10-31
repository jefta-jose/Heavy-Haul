import { hashRandom } from '../canvas-utils.js';

// Bridges, after the reference's wooden and metal crossings: a deck of timber planks laid across the
// road, each board's painted sleeper face (bridge-plank art) in front, a stringer beam under the
// deck, the timber or steel support frame below, and a railing along the far side (behind the truck,
// so it never covers the wheels). Every board is drawn at its physical body's transform, so on the
// broken crossing the gap shows exactly where the physics has one.

const DECK = { front: 0.1, back: 0.65, skew: 0.18 };   // board-local: top surface from the front edge to the far edge
const PLANK = 0.24;                                      // width of one deck plank along the road
const WOOD = [[75, 53, 34], [160, 124, 93]];             // dark and light timber, sampled from the plank art
const STEEL = { beam: '#4a4136', dark: '#2a241d', rivet: '#1c1813', rail: '#56493a' };

const mix = (t, a = WOOD[0], b = WOOD[1]) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const rgb = (c, k = 1) => `rgb(${c.map(v => Math.round(v * k)).join(',')})`;

export function createBridgeLayer(scene) {
  const { ctx } = scene.view, sim = scene.sim;

  // one board: several planks across the road, its sleeper face in front, a beam under it
  function board(bridge, plank, bi) {
    const p = plank.body.getPosition(), L = plank.length, steel = bridge.style === 'steel';
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(plank.body.getAngle());
    // stringer beam under the deck
    ctx.fillStyle = steel ? STEEL.beam : rgb(WOOD[0], 0.8);
    ctx.fillRect(-L / 2 - 0.01, -0.34, L + 0.02, 0.26);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(-L / 2 - 0.01, -0.34, L + 0.02, 0.07);
    if (steel) { ctx.fillStyle = STEEL.rivet; for (const x of [-L * 0.3, L * 0.3]) { ctx.beginPath(); ctx.arc(x, -0.21, 0.022, 0, 7); ctx.fill(); } }
    // deck planks, seen from a little above: each runs from the near edge to the far edge
    const n = Math.max(1, Math.round(L / PLANK)), w = L / n, { front, back, skew } = DECK;
    for (let k = 0; k < n; k++) {
      const a = -L / 2 + k * w, b = a + w - 0.014, r = hashRandom(bi * 7.3 + k * 1.9 + bridge.x0);
      const c = mix(0.25 + r * 0.55);
      const g = ctx.createLinearGradient(0, front, 0, back);
      g.addColorStop(0, rgb(c, 1.08)); g.addColorStop(1, rgb(c, 0.82));
      ctx.beginPath(); ctx.moveTo(a, front); ctx.lineTo(b, front); ctx.lineTo(b + skew, back); ctx.lineTo(a + skew, back); ctx.closePath();
      ctx.fillStyle = g; ctx.fill();
      // grain along the plank, and the nails at each stringer
      ctx.strokeStyle = rgb(c, 0.62); ctx.globalAlpha = 0.55; ctx.lineWidth = 0.008; ctx.beginPath();
      for (const t of [0.3 + r * 0.15, 0.68 - r * 0.1]) { const x = a + (b - a) * t; ctx.moveTo(x, front + 0.03); ctx.lineTo(x + skew * 0.95, back - 0.02); }
      ctx.stroke(); ctx.globalAlpha = 1;
      ctx.fillStyle = '#2a2017';
      for (const [t, y] of [[0.5, front + 0.07], [0.5, back - 0.07]]) { const s = (y - front) / (back - front); ctx.beginPath(); ctx.arc(a + (b - a) * t + skew * s, y, 0.014, 0, 7); ctx.fill(); }
      ctx.strokeStyle = 'rgba(30,22,14,0.8)'; ctx.lineWidth = 0.01;
      ctx.beginPath(); ctx.moveTo(b, front); ctx.lineTo(b + skew, back); ctx.stroke();
    }
    // the near sleeper face: the painted plank art, or a plain timber / steel edge
    const art = scene.images.bridgePlank, reg = scene.season.render.obstacles?.bridgePlank;
    if (steel) {
      ctx.fillStyle = STEEL.beam; ctx.fillRect(-L / 2, -0.1, L + 0.01, 0.2);
      ctx.fillStyle = 'rgba(255,240,210,0.08)'; ctx.fillRect(-L / 2, 0.06, L + 0.01, 0.04);
      ctx.fillStyle = STEEL.rivet; for (const x of [-L * 0.35, 0, L * 0.35]) { ctx.beginPath(); ctx.arc(x, 0, 0.02, 0, 7); ctx.fill(); }
    } else if (art && reg) {
      const [x0, y0] = reg.nearLeft, [x1] = reg.nearRight;
      ctx.save(); ctx.scale(1, -1); ctx.drawImage(art, x0, y0, x1 - x0, 166, -L / 2, -0.1, L + 0.012, 0.2); ctx.restore();
    } else { ctx.fillStyle = rgb(mix(0.35)); ctx.fillRect(-L / 2, -0.1, L, 0.2); }
    ctx.strokeStyle = 'rgba(25,18,11,0.7)'; ctx.lineWidth = 0.012; ctx.strokeRect(-L / 2, -0.1, L + 0.01, 0.2);
    ctx.restore();
  }

  // splintered plank ends either side of a missing board
  function gap(plank) {
    const p = plank.body.getPosition(), L = plank.length;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(plank.body.getAngle());
    for (const [side, r] of [[-1, 0.3], [1, 0.7]]) {
      const x = side * L / 2;
      ctx.fillStyle = rgb(mix(r), 0.85); ctx.beginPath();
      ctx.moveTo(x, DECK.front); ctx.lineTo(x - side * 0.16, DECK.front - 0.05); ctx.lineTo(x - side * 0.05, DECK.front - 0.24);
      ctx.lineTo(x - side * 0.12, DECK.front - 0.4); ctx.lineTo(x, DECK.front - 0.18); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  // railing along the far edge of the deck: a post every other board, a top and a middle rail
  function railing(bridge) {
    const steel = bridge.style === 'steel', H = 0.95, posts = [];
    const farEdge = (plank, x) => { const p = plank.body.getPosition(), a = plank.body.getAngle(); return [p.x + x * Math.cos(a) - DECK.back * Math.sin(a) + DECK.skew, p.y + x * Math.sin(a) + DECK.back * Math.cos(a)]; };
    posts.push([bridge.x0 + DECK.skew, bridge.y0 + DECK.back]);
    bridge.boards.forEach((plank, i) => { if (!plank.missing && i % 2 === 1) posts.push(farEdge(plank, 0)); });
    posts.push([bridge.x1 + DECK.skew, bridge.y1 + DECK.back]);
    const color = steel ? STEEL.rail : rgb(WOOD[0], 1.05), shade = steel ? STEEL.dark : rgb(WOOD[0], 0.6);
    ctx.lineCap = 'round';
    for (const [h, wide] of [[H, steel ? 0.05 : 0.07], [H * 0.5, steel ? 0.035 : 0.05]]) {
      ctx.strokeStyle = shade; ctx.lineWidth = wide + 0.02; ctx.beginPath();
      let pen = false;
      for (const [x, y] of posts) { if (!pen) { ctx.moveTo(x, y + h); pen = true; } else ctx.lineTo(x, y + h); }
      ctx.stroke(); ctx.strokeStyle = color; ctx.lineWidth = wide; ctx.stroke();
    }
    for (const [x, y] of posts) {
      ctx.fillStyle = shade; ctx.fillRect(x - 0.05, y, 0.1, H + 0.06);
      ctx.fillStyle = color; ctx.fillRect(x - 0.04, y, 0.065, H + 0.05);
    }
    ctx.lineCap = 'butt';
  }

  function draw() {
    const [lo, hi] = scene.view.viewX();
    for (const bridge of sim.bridges) {
      if (bridge.x1 < lo || bridge.x0 > hi) continue;
      const steel = bridge.style === 'steel';
      const frame = scene.cache.img[steel ? 'bridgeSteelFrame' : 'bridgeFrame'];
      if (frame) {
        const length = bridge.x1 - bridge.x0, slope = (bridge.y1 - bridge.y0) / length;
        ctx.save(); ctx.translate(bridge.x0, bridge.y0 - 0.3); ctx.transform(1, slope, 0, -1, 0, 0);
        ctx.drawImage(frame, -0.35, 0, length + 0.7, Math.min(2.6, bridge.depth * 0.85)); ctx.restore();
      }
      railing(bridge);
      bridge.boards.forEach((plank, i) => { if (plank.missing) gap(plank); else board(bridge, plank, i); });
      // abutment posts where the deck meets the bank
      for (const [x, y] of [[bridge.x0, bridge.y0], [bridge.x1, bridge.y1]]) {
        ctx.fillStyle = steel ? STEEL.beam : rgb(WOOD[0], 0.9); ctx.fillRect(x - 0.11, y - 0.7, 0.22, 0.85);
        ctx.strokeStyle = steel ? STEEL.dark : rgb(WOOD[0], 0.55); ctx.lineWidth = 0.025; ctx.strokeRect(x - 0.11, y - 0.7, 0.22, 0.85);
      }
    }
  }
  return { draw, drawFront() {} };
}
