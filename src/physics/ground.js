// Soft ground that gives under weight. Every tire on mud, creek, dirt or gravel presses a rut into a
// depth field (`terrain.dent`, one value every 0.25 m) that lowers the collision surface, so the
// tires really sink. The heavier the load on a tire, the deeper the rut it can make and the faster it
// gets there; standing still or spinning keeps digging, and every pass of every axle adds to it. A
// heavy truck leaves ruts a scout then has to climb out of. Ruts never reset: they heal slowly back
// to the original ground everywhere no tire is pressing (and, between visits, by the real time that
// has passed; see `export` / `import`).

// how much each surface gives (season.json `surfaces.<id>.give` overrides); rock, wood and bridges 0
const GIVE = { mud: 1, creek: 0.6, dirt: 0.3, gravel: 0.12 };
export const RUT = {
  deep: 0.36,      // m: the deepest a rut gets in mud under a very heavy tire (scaled by give)
  ofRadius: 0.32,  // and never deeper than this share of the tire's radius, so a tire can climb out
  rate: 0.004,     // m/s per unit of pressure while a tire stands on a spot
  dig: 0.008,      // m/s per m/s of wheelspin: a spinning tire digs itself in
  slope: 0.08,     // m between neighbouring cells (0.25 m apart): rut walls stay climbable
  halfLife: 420,   // s: untouched ruts lose half their depth in 7 minutes
  storeUnit: 0.004, // m per stored step (one byte per cell, up to 1.02 m)
};

export function createGround(terrain, surfaces) {
  const D = terrain.dent, N = D.length, X0 = terrain.X0, DX = terrain.step;
  const W = new Float32Array(N);     // tire width scale of the widest tire that pressed each cell (drawing)
  const pressed = new Uint8Array(N); // pressed since the last heal tick: those cells do not heal
  const G = new Float32Array(N);     // how much each cell gives
  for (let i = 0; i < N; i++) { const x = X0 + i * DX, s = terrain.surfAt(x); G[i] = terrain.bridgeAt(x) ? 0 : (surfaces[s]?.give ?? GIVE[s] ?? 0); }
  const cellOf = x => Math.round((x - X0) / DX);
  let healT = 0;

  // keep rut walls climbable: a cell may sit at most RUT.slope below its neighbour; the excess spreads
  // into soft neighbours (deepening them) and is simply lost against firm ground
  function settle(a, b) {
    a = Math.max(0, a); b = Math.min(N - 1, b);
    for (let pass = 0; pass < 2; pass++) {
      for (let i = a; i < b; i++) relax(i, i + 1);
      for (let i = b; i > a; i--) relax(i, i - 1);
    }
  }
  function relax(i, j) {
    const diff = D[i] - D[j] - RUT.slope; if (diff <= 0) return;
    if (G[j] > 0) { D[i] -= diff / 2; D[j] += diff / 2; } else D[i] -= diff;
  }

  // a tire of radius R carrying loadT tonnes at x, spinning at `slip` m/s, for dt seconds
  function press(x, R, loadT, slip, dt) {
    const c = cellOf(x); if (c < 0 || c >= N || !G[c] || loadT <= 0) return;
    const p = Math.pow(loadT, 0.7) / Math.sqrt(R);                 // ground pressure, roughly
    const cap = Math.min(RUT.deep * p / (p + 2.5), RUT.ofRadius * R);
    const spin = Math.min(slip, 3), half = R * 0.42;
    const c0 = Math.max(0, cellOf(x - half)), c1 = Math.min(N - 1, cellOf(x + half));
    for (let k = c0; k <= c1; k++) {
      if (!G[k]) continue;
      const u = Math.abs(X0 + k * DX - x) / half, f = Math.sqrt(Math.max(0, 1 - u * u));   // rounded contact patch
      const limit = G[k] * cap * (1 + 0.25 * Math.min(1, spin / 2)) * f;
      if (D[k] < limit) D[k] = Math.min(limit, D[k] + G[k] * (RUT.rate * p + RUT.dig * spin) * f * dt);
      W[k] = Math.max(W[k], Math.min(1.6, Math.max(0.8, R / 0.87)));
      pressed[k] = 1;
    }
    settle(c0 - 12, c1 + 12);
  }

  // ruts heal once a second, except where a tire is pressing
  function heal(dt) {
    healT += dt; if (healT < 1) return;
    const k = Math.pow(0.5, healT / RUT.halfLife); healT = 0;
    for (let i = 0; i < N; i++) {
      if (pressed[i]) { pressed[i] = 0; continue; }
      if (D[i] > 0) { D[i] *= k; if (D[i] < 0.002) { D[i] = 0; W[i] = 0; } }
    }
  }

  // stored as one byte per cell (depth and width), healed on load by the time that has passed
  const b64 = bytes => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); };
  const unb64 = str => Uint8Array.from(atob(str), ch => ch.charCodeAt(0));
  function exportState(now) {
    const d = new Uint8Array(N), w = new Uint8Array(N);
    for (let i = 0; i < N; i++) { d[i] = Math.min(255, Math.round(D[i] / RUT.storeUnit)); w[i] = Math.round(W[i] * 100); }
    return { v: 1, n: N, at: now, d: b64(d), w: b64(w) };
  }
  function importState(s, now) {
    if (!s || s.v !== 1 || s.n !== N) return false;
    const d = unb64(s.d), w = unb64(s.w), k = Math.pow(0.5, Math.max(0, (now - s.at) / 1000) / RUT.halfLife);
    for (let i = 0; i < N; i++) { D[i] = G[i] ? d[i] * RUT.storeUnit * k : 0; W[i] = w[i] / 100; if (D[i] < 0.002) { D[i] = 0; W[i] = 0; } }
    return true;
  }

  return {
    press, heal, cellOf, widthAt: i => W[i], giveAt: i => G[i],
    depthAt: x => { const c = cellOf(x); return c >= 0 && c < N ? D[c] : 0; },
    // metres of trail with a rut deeper than 2 cm (tests, HUD)
    get rutMetres() { let n = 0; for (let i = 0; i < N; i++) if (D[i] > 0.02) n++; return n * DX; },
    export: exportState, import: importState,
  };
}
