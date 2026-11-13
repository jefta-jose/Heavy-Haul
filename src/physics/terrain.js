import { smoothstep as sm, seededRandom, valueNoise } from './math.js';
import { STATION_BAY_M } from '../game-config.js';

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
  const HV = new Float32Array(N), HC = new Float32Array(N), heavy = new Float32Array(N);
  const features = [];
  const holes = trail.holes ?? [], gardens = trail.rockGardens ?? [];
  const nearHole = (x, pad = 0) => holes.some(h => Math.abs(x - h.x) < h.width / 2 + pad);
  const authored = x => nearHole(x, 2) || gardens.some(g => x > g.x0 - 2 && x < g.x1 + 2) || (trail.ramps ?? []).some(r => x > r.x - 2 && x < r.x + r.face + r.plateau + r.back + 2)
    // a step or pothole under a run of logs or pipes could make it too tall to climb at all
    || (trail.obstacleRuns ?? []).some(r => x > r.x - 8 && x < r.x + (r.gaps ?? []).reduce((a, b) => a + b, 0) + 2 * (r.radius ?? 0.5) * (trail.obstacleScale ?? 1) * r.count + 3);
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

  // places kept calm so the start, fuel stop and depot stay drivable; a highway is calm from end to end (no authored features),
  // though trail.rollers.highway can still roll bumps along it
  const stations = trail.stations ?? [];
  const CALM = [[trail.start - 20, trail.start + 14], [trail.depot - 10, X1], ...(trail.recoverySections ?? []), ...stations.map(s => [s.x - STATION_BAY_M / 2 - 2, s.x + STATION_BAY_M / 2 + 2]), ...(trail.highways ?? []).map(h => [h.x0, h.x1])];
  const calm = x => { let c = 1; for (const [a, b] of CALM) c = Math.min(c, 1 - sm((x - a + 6) / 6) * sm((b + 6 - x) / 6)); return c; };
  const nearCalm = (x, pad) => CALM.some(([a, b]) => x > a - pad && x < b + pad);

  const stepFace = h => Math.max(0.55, Math.abs(h) * 1.5 / TIRE_CLIMB);
  function buildFeatures() {
    for (const [z0, z1, s] of ZONES) {
      if (s === 'dirt' || s === 'gravel') {
        for (let x = z0 + 6; x < z1 - 8; x += 4 + rnd() * 6) {
          if (nearCalm(x, 4) || authored(x)) continue;
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
          if (nearCalm(x, 4) || authored(x)) continue;
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
    for (const hole of holes) features.push({ type: 'bump', c: hole.x, w: hole.width, h: -hole.depth, authored: 'hole' });
    for (const r of trail.ramps ?? []) features.push({ type: 'ledge', x0: r.x, face: r.face, h: r.height, plat: r.plateau, back: r.back, authored: 'ramp' });
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
  // Rolling bumps (trail.rollers) along every stretch with nothing else to do: uneven humps, trough to trough, faded out around bog pits, obstacles and
  // the calm places. A stream of its own random numbers, so the authored features stay where they are.
  function rollersAt() {
    const R = trail.rollers, out = new Float32Array(N); if (!R) return out;

    // adding this guy here to manipulate the bumps
    const BUMP_INTENSITY = R.intensity ?? 1.0;

    // rollers.highway: how big the bumps run on the highways (0 or absent keeps a highway smooth)
    const onHighway = R.highway ? (trail.highways ?? []) : [], S = trail.obstacleScale ?? 1;
    const keep = CALM.filter(([a, b]) => !onHighway.some(h => h.x0 === a && h.x1 === b));
    for (const c of HEAVY_MUD) keep.push([c - 12, c + 12]);
    for (const h of holes) keep.push([h.x - h.width / 2, h.x + h.width / 2]);
    for (const g of gardens) keep.push([g.x0, g.x1]);
    for (const r of trail.ramps ?? []) keep.push([r.x, r.x + r.face + r.plateau + r.back]);
    for (const r of trail.obstacleRuns ?? []) keep.push([r.x - 1, r.x + (r.gaps ?? []).reduce((a, b) => a + b, 0) + 2 * (r.radius ?? 0.5) * S * r.count + 1]);
    for (const p of trail.props ?? []) { const w = (trail.propKinds?.[p.kind]?.width ?? 2) * S; keep.push([p.x - w / 2, p.x + w / 2]); }
    for (const f of features) {
      if (f.type === 'ledge') keep.push([f.x0, f.x0 + f.face + f.plat + Math.min(f.back, 6)]);
      else if (f.type === 'ramp') keep.push([f.x0, f.x0 + f.len]);
      else if (f.type === 'slab') keep.push([f.c - f.w / 2, f.c + f.w / 2]);
    }
    const next = seededRandom(R.seed), between = ([a, b]) => a + next() * (b - a), mean = (R.height[0] + R.height[1]) / 2, F = R.fade;
    let x = X0, i = 0;
    while (x < X1) {
      const L = between(R.wave), H = between(R.height) * Math.min(1, L / 9), crest = 0.4 + next() * 0.2;   // the crest falls off-centre, so no two humps match
      for (; i < N && X0 + i * DX < x + L; i++) {
        const X = X0 + i * DX, t = (X - x) / L;
        const y = H * 0.5 * (1 - Math.cos(Math.PI * (t < crest ? t / crest : (1 - t) / (1 - crest)))) - mean / 2;
        let open = surfAt(X) === 'mud' ? R.mud : 1;
        for (const [a, b] of keep) { if (X > a - F && X < b + F) open = Math.min(open, 1 - sm((X - a + F) / F) * sm((b + F - X) / F)); }
        
        // manipulation is done here
        const paved = onHighway.reduce((v, h) => Math.max(v, sm((X - h.x0 + F) / F) * sm((h.x1 + F - X) / F)), 0);
        out[i] = y * open * BUMP_INTENSITY * (1 - paved * (1 - R.highway));
      }
      x += L;
    }
    return out;
  }
  // A highway's long, smooth waves: a gentle rise then a gentle dip, over and over, so it feels like a road at speed and not
  // like the swamp's bumps. Each wave starts and ends level, and the first and last stretches stay flat.
  function highwayWavesAt() {
    const out = new Float32Array(N);
    for (const h of trail.highways ?? []) {
      if (!h.waves) continue;
      const next = seededRandom(h.waves.seed), between = ([a, b]) => a + next() * (b - a), end = h.x1 - 20;
      let x = h.x0 + 20, up = 1;
      for (let L = between(h.waves.wave), H = between(h.waves.height); x + L < end; x += L, L = between(h.waves.wave), H = between(h.waves.height), up = -up) {
        for (let i = Math.max(0, Math.ceil((x - X0) / DX)); i < N && X0 + i * DX < x + L; i++) out[i] = up * H * 0.5 * (1 - Math.cos(2 * Math.PI * (X0 + i * DX - x) / L));
      }
    }
    return out;
  }
  function buildHeights() {
    buildFeatures();
    const rollers = rollersAt(), waves = highwayWavesAt();
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
      // on a highway the road's own texture goes too, leaving only its smooth waves
      const paved = (trail.highways ?? []).reduce((v, h) => Math.max(v, sm((x - h.x0 + 6) / 6) * sm((h.x1 + 6 - x) / 6)), 0);
      HV[i] = macro(x) + broad + n * (0.25 + 0.75 * c) * (1 - paved) + featureAt(x) * c + rollers[i] + waves[i];
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

  // Physics keeps the exact smoothstep arithmetic: interpolating a Float32 table would
  // change tire forces and deterministic trajectories. Rendering can sample the table.
  const mudHeavyAt = x => {
    if (surfAt(x) !== 'mud') return 0;
    let value = 0;
    for (const centre of HEAVY_MUD) value = Math.max(value, sm(1 - Math.abs(x - centre) / 10));
    return value;
  };
  buildHeights();
  for (let i = 0; i < N; i++) heavy[i] = mudHeavyAt(X0 + i * DX);
  const mudAt = (x, out = {}) => {
    if (surfAt(x) !== 'mud') { out.heavy = out.depth = out.intensity = 0; return out; }
    const z = ZONES.find(z => x >= z[0] && x < z[1]);
    out.heavy = sample(heavy, x); out.depth = visH(x) - colH(x);
    out.intensity = (0.35 + out.heavy * 0.65) * sm(Math.min(x - z[0], z[1] - x) / 5);
    return out;
  };
  const stationAt = x => stations.find(s => Math.abs(x - s.x) <= STATION_BAY_M / 2);
  return { stations, stationAt, X0, X1, step: DX, zones: ZONES, features, holes, nearHole, surfAt, visH, colH, mudAt, mudHeavyAt, nearCalm, nearStep };
}
