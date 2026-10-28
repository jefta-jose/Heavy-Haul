import { smoothstep as sm, seededRandom, valueNoise } from './math.js';

// One height profile shared by physics and rendering. The macro shape comes from the trail keys
// (monotone cubic, so slopes run continuously), plus value noise scaled by surface, plus authored
// obstacles: washboard, potholes, mounds, stepped climbs, rock ledges, slabs and mud pits.
// visH is the drawn surface; colH is where tires actually rest (mud sinks them).

const DX = 0.25;          // height-field spacing in metres
const TIRE_CLIMB = 0.84;  // step faces stay under ~40 degrees (smoothstep peak slope is 1.5 h / face)

export function createTerrain(trail, surfaces) {
  const { keys: KEYS, zones: ZONES, heavyMud: HEAVY_MUD } = trail;
  const X0 = KEYS[0][0], X1 = KEYS[KEYS.length - 1][0];
  const N = Math.round((X1 - X0) / DX) + 1;
  const HV = new Float32Array(N), HC = new Float32Array(N);
  const features = [];
  const rnd = seededRandom(trail.seed);

  const surfAt = x => { for (const z of ZONES) if (x >= z[0] && x < z[1]) return z[2]; return 'dirt'; };

  // Fritsch-Carlson slopes for monotone cubic interpolation of the keys
  const KM = (() => {
    const n = KEYS.length, d = [], m = new Array(n).fill(0);
    for (let i = 0; i < n - 1; i++) d.push((KEYS[i + 1][1] - KEYS[i][1]) / (KEYS[i + 1][0] - KEYS[i][0]));
    m[0] = d[0]; m[n - 1] = d[n - 2];
    for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
    for (let i = 0; i < n - 1; i++) {
      if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; }
      const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
      if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
    }
    return m;
  })();
  function macro(x) {
    let i = 0; while (i < KEYS.length - 2 && x > KEYS[i + 1][0]) i++;
    const [x0, y0] = KEYS[i], [x1, y1] = KEYS[i + 1], h = x1 - x0, t = Math.max(0, Math.min(1, (x - x0) / h));
    const t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * y0 + (t3 - 2 * t2 + t) * h * KM[i] + (-2 * t3 + 3 * t2) * y1 + (t3 - t2) * h * KM[i + 1];
  }

  // places kept calm so the start, fuel stop and depot stay drivable
  const CALM = [[trail.start - 20, trail.start + 14], [trail.fuel - 14, trail.fuel + 14], [trail.depot - 10, X1]];
  const calm = x => { let c = 1; for (const [a, b] of CALM) c = Math.min(c, 1 - sm((x - a + 6) / 6) * sm((b + 6 - x) / 6)); return c; };
  const nearCalm = (x, pad) => CALM.some(([a, b]) => x > a - pad && x < b + pad);

  const stepFace = h => Math.max(0.55, Math.abs(h) * 1.5 / TIRE_CLIMB);
  function buildFeatures() {
    for (const [z0, z1, s] of ZONES) {
      if (s === 'dirt' || s === 'gravel') {
        for (let x = z0 + 6; x < z1 - 8; x += 4 + rnd() * 6) {
          if (nearCalm(x, 4)) continue;
          const r = rnd();
          if (r < 0.3) {                                       // washboard run
            const n = 3 + Math.floor(rnd() * 4), gap = 1.4 + rnd() * 0.8;
            for (let k = 0; k < n; k++) features.push({ type: 'bump', c: x + k * gap, w: gap * 0.9, h: 0.11 + rnd() * 0.11 });
            x += n * gap;
          } else if (r < 0.42) features.push({ type: 'bump', c: x, w: 1.0 + rnd() * 0.7, h: -(0.14 + rnd() * 0.12) });  // small pothole
          else if (r < 0.52) { features.push({ type: 'bump', c: x + 1.5, w: 2.8 + rnd() * 1.2, h: -(0.42 + rnd() * 0.22) }); x += 4.5; }  // deep pothole the tires drop into
          else if (r < 0.72) features.push({ type: 'bump', c: x, w: 2.8 + rnd() * 2.6, h: 0.28 + rnd() * 0.3 });     // mound
          else if (s === 'dirt' && x < z1 - 34 && !nearCalm(x, 34)) {   // stepped climb: two or three ledges, then a ramp down
            const n = 2 + Math.floor(rnd() * 2);
            for (let k = 0; k < n; k++) { const h = 0.26 + rnd() * 0.2; features.push({ type: 'ledge', x0: x, face: stepFace(h), h, plat: 2.2 + rnd() * 1.8, back: 1e9 }); x += stepFace(h) + 2.4 + rnd() * 1.6; }
            features.push({ type: 'ramp', x0: x + 1, len: 9 + rnd() * 6, h: -features.slice(-n).reduce((a, f) => a + f.h, 0) });
            x += 16;
          }
        }
      } else if (s === 'rock') {
        for (let x = z0 + 6; x < z1 - 8; x += 5 + rnd() * 6) {
          const r = rnd();
          if (r < 0.5) {
            const up = macro(x + 4) - macro(x - 4) >= -0.4, lh = 0.28 + rnd() * 0.22;   // ledges face the way the road climbs
            features.push({ type: 'ledge', x0: x, face: stepFace(lh), h: (up ? 1 : -1) * lh, plat: 1.4 + rnd() * 2.2, back: 6 + rnd() * 6 });
            x += 5;
          } else if (r < 0.78) features.push({ type: 'slab', c: x, w: 1.8 + rnd() * 2.2, h: 0.18 + rnd() * 0.18, edge: 0.4 });
          else features.push({ type: 'bump', c: x + 1, w: 2.4 + rnd() * 0.8, h: -(0.3 + rnd() * 0.15) });   // pothole between the rocks
        }
      } else if (s === 'mud') {
        for (let x = z0 + 10; x < z1 - 10; x += 24 + rnd() * 14) features.push({ type: 'bump', c: x + 8, w: 14 + rnd() * 10, h: -(0.35 + rnd() * 0.25) });   // bowls
        for (let x = z0 + 4; x < z1 - 4; x += 3 + rnd() * 4) features.push({ type: 'bump', c: x, w: 1.4 + rnd() * 1.2, h: (rnd() < 0.7 ? -1 : 1) * (0.07 + rnd() * 0.09) });   // ruts
        for (const hx of HEAVY_MUD) if (hx > z0 && hx < z1) features.push({ type: 'bump', c: hx, w: 18, h: -0.6 });   // heavy mud pit
      } else if (s === 'creek') {
        for (let x = z0 + 4; x < z1 - 4; x += 3 + rnd() * 4) features.push({ type: 'bump', c: x, w: 0.8 + rnd() * 1.2, h: (rnd() < 0.5 ? -1 : 1) * (0.08 + rnd() * 0.12) });
      }
    }
  }
  function featureAt(x) {
    let y = 0;
    for (const f of features) {
      if (f.type === 'bump') { const d = Math.abs(x - f.c) / (f.w / 2); if (d < 1) y += f.h * 0.5 * (1 + Math.cos(Math.PI * d)); }
      else if (f.type === 'slab') { const d = Math.abs(x - f.c) - f.w / 2; if (d < f.edge) y += f.h * (1 - sm((d + f.edge) / (2 * f.edge))); }
      else if (f.type === 'ledge') {
        const a = x - f.x0; if (a < 0 || a > f.face + f.plat + f.back) continue;
        y += f.h * (sm(a / f.face) - sm((a - f.face - f.plat) / f.back));
      }
      else if (f.type === 'ramp') { const a = x - f.x0; if (a > 0) y += f.h * sm(a / f.len); }
    }
    return y;
  }
  function buildHeights() {
    buildFeatures();
    const amps = [0, 1, 2].map(() => new Float32Array(N)), sink = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const x = X0 + i * DX, s = surfAt(x), a = surfaces[s].noise;
      for (let k = 0; k < 3; k++) amps[k][i] = a[k];
      if (s === 'mud') {
        const z = ZONES.find(z => x >= z[0] && x < z[1]);
        const heavy = HEAVY_MUD.reduce((v, centre) => Math.max(v, sm(1 - Math.abs(x - centre) / 10)), 0);
        sink[i] = (surfaces.mud.sink + (surfaces.mud.heavySink ?? 0) * heavy) * sm(Math.min(x - z[0], z[1] - x) / 8);
      }
    }
    // blend noise amplitudes across zone borders (box filter, 6 m)
    const R = Math.round(3 / DX);
    const blur = arr => { const out = new Float32Array(N); let acc = 0; for (let i = -R; i < N + R; i++) { acc += arr[Math.min(N - 1, Math.max(0, i + R))] - arr[Math.min(N - 1, Math.max(0, i - R - 1))]; if (i >= 0 && i < N) out[i] = acc / (2 * R + 1); } return out; };
    const A = amps.map(blur);
    for (let i = 0; i < N; i++) {
      const x = X0 + i * DX, c = calm(x);
      const broad = (valueNoise(x / 38, 1) * 0.7 + valueNoise(x / 17, 2) * 0.35) * c;
      const n = valueNoise(x / 9, 3) * A[0][i] + (valueNoise(x / 2.2, 4) * 0.7 + valueNoise(x / 1.3, 5) * 0.3) * A[1][i] + valueNoise(x / 0.7, 6) * A[2][i];
      HV[i] = macro(x) + broad + n * (0.25 + 0.75 * c) + featureAt(x) * c;
      HC[i] = HV[i] - sink[i];
    }
  }
  const sample = (arr, x) => {
    const f = (x - X0) / DX, i = Math.floor(f);
    if (i <= 0) return arr[0]; if (i >= N - 1) return arr[N - 1];
    return arr[i] + (arr[i + 1] - arr[i]) * (f - i);
  };
  const visH = x => sample(HV, x);
  const colH = x => sample(HC, x);
  // near a ledge face or slab edge, so obstacles are not dropped onto a step
  const nearStep = x => features.some(f => (f.type === 'ledge' && x > f.x0 - 3 && x < f.x0 + f.face + 2) || (f.type === 'slab' && Math.abs(Math.abs(x - f.c) - f.w / 2) < 1.5));

  buildHeights();
  const bridges = (trail.bridges ?? []).map(b => ({ capacityT: 14, sag: 0.2, depth: 1.5, ...b, y0: visH(b.x0), y1: visH(b.x1) }));
  for (const b of bridges) for (let i = Math.ceil((b.x0 - X0) / DX); i <= Math.floor((b.x1 - X0) / DX); i++) {
    const x = X0 + i * DX, cut = b.depth * sm(Math.min(x - b.x0, b.x1 - x) / 1.5);
    HV[i] -= cut; HC[i] -= cut;
  }
  const bridgeAt = x => bridges.find(b => x >= b.x0 && x <= b.x1);
  const driveH = x => { const b = bridgeAt(x); if (!b) return visH(x); const t = (x - b.x0) / (b.x1 - b.x0); return b.y0 + (b.y1 - b.y0) * t - b.sag * Math.sin(Math.PI * t); };
  const mudAt = x => {
    if (surfAt(x) !== 'mud') return { intensity: 0, depth: 0, heavy: 0 };
    const z = ZONES.find(z => x >= z[0] && x < z[1]);
    const heavy = HEAVY_MUD.reduce((v, centre) => Math.max(v, sm(1 - Math.abs(x - centre) / 10)), 0);
    return { heavy, depth: visH(x) - colH(x), intensity: (0.35 + heavy * 0.65) * sm(Math.min(x - z[0], z[1] - x) / 5) };
  };
  // water surfaces sit a fixed depth above the lowest point of their basin
  const waters = trail.waters.map(w => ({ ...w }));
  for (const wb of waters) {
    let lo = Infinity; for (let x = wb.x0; x <= wb.x1; x += DX) lo = Math.min(lo, visH(x));
    wb.level = lo + wb.depth;
  }

  return { X0, X1, step: DX, zones: ZONES, waters, features, surfAt, visH, colH, driveH, bridgeAt, bridges, mudAt, nearCalm, nearStep };
}
