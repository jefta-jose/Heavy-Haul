// Rigid bridge decks, as in SnowRunner: each board is a static block laid along the deck line (with its
// authored sag), so a bridge never swings, flexes or breaks and costs the solver nothing. The broken
// crossing keeps its gap: the missing board is a sensor a tire falls through. Hinged boards that
// flexed, cracked and could fail under overload were dropped on 2026-10-31.
export function buildBridges({ pl, world, terrain }) {
  const V = (x, y) => new pl.Vec2(x, y), bridges = [];
  for (const spec of terrain.bridges) {
    const length = spec.x1 - spec.x0, count = Math.ceil(length / 0.7), dx = length / count;
    const deck = x => spec.y0 + (spec.y1 - spec.y0) * (x - spec.x0) / length - spec.sag * Math.sin(Math.PI * (x - spec.x0) / length);
    const bridge = { ...spec, boards: [] };
    for (let i = 0; i < count; i++) {
      const x0 = spec.x0 + i * dx, x1 = x0 + dx, y0 = deck(x0), y1 = deck(x1), len = Math.hypot(dx, y1 - y0);
      const body = world.createBody({ type: 'static', position: V((x0 + x1) / 2, (y0 + y1) / 2 - 0.1), angle: Math.atan2(y1 - y0, dx) });
      const board = { body, length: len, bridge, index: i, missing: i === spec.missingBoard };
      body.createFixture(new pl.Box(len / 2 + 0.012, 0.1), { friction: 0.9, isSensor: board.missing, userData: { surf: 'wood', bridgeBoard: board }, filterGroupIndex: -300 });
      bridge.boards.push(board);
    }
    bridges.push(bridge);
  }
  return { bridges };
}
