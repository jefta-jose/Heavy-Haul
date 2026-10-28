// Planck boards connected by limited hinges. Fatigue releases a hinge only under sustained overload.
export function buildBridges({ pl, world, terrain, events }) {
  const V = (x, y) => new pl.Vec2(x, y), bridges = [], anchors = world.createBody();
  for (const spec of terrain.bridges) {
    const length = spec.x1 - spec.x0, count = Math.ceil(length / 0.7), dx = length / count;
    const deck = x => spec.y0 + (spec.y1 - spec.y0) * (x - spec.x0) / length - spec.sag * Math.sin(Math.PI * (x - spec.x0) / length);
    const bridge = { ...spec, boards: [], hinges: [], broken: false, crackClock: 0, maxDeflection: 0 };
    for (let i = 0; i < count; i++) {
      const x0 = spec.x0 + i * dx, x1 = x0 + dx, y0 = deck(x0), y1 = deck(x1), len = Math.hypot(dx, y1 - y0);
      const body = world.createBody({ type: 'dynamic', position: V((x0 + x1) / 2, (y0 + y1) / 2 - 0.1), angle: Math.atan2(y1 - y0, dx), angularDamping: 1.4, linearDamping: 0.2 });
      const board = { body, length: len, restY: body.getPosition().y, force: 0, damage: 0, cracked: false, bridge, index: i };
      body.createFixture(new pl.Box(len / 2 + 0.012, 0.1), { density: 900, friction: 0.9, userData: { surf: 'wood', bridgeBoard: board }, filterGroupIndex: -300 });
      bridge.boards.push(board);
      bridge.hinges.push(world.createJoint(new pl.RevoluteJoint({ enableLimit: true, lowerAngle: -0.22, upperAngle: 0.22, collideConnected: false }, i ? bridge.boards[i - 1].body : anchors, body, V(x0, y0 - 0.1))));
    }
    bridge.hinges.push(world.createJoint(new pl.RevoluteJoint({ enableLimit: true, lowerAngle: -0.22, upperAngle: 0.22 }, bridge.boards.at(-1).body, anchors, V(spec.x1, deck(spec.x1) - 0.1))));
    bridges.push(bridge);
  }
  world.on('post-solve', (contact, impulse) => {
    const a = contact.getFixtureA().getUserData(), b = contact.getFixtureB().getUserData(), board = a?.bridgeBoard ?? b?.bridgeBoard;
    if (board && (a?.tire || b?.tire)) board.force += impulse.normalImpulses.reduce((sum, n) => sum + n, 0);
  });
  return { bridges, afterStep(dt) {
    for (const bridge of bridges) {
      bridge.crackClock = Math.max(0, bridge.crackClock - dt);
      for (const board of bridge.boards) {
        bridge.maxDeflection = Math.max(bridge.maxDeflection, board.restY - board.body.getPosition().y);
        const force = board.force / dt, overload = Math.max(0, force / (bridge.capacityT * 1000 * 9.81 * 0.5) - 1);
        board.damage = Math.min(1, board.damage + overload * dt * 0.35);
        if (force > 2500 && !board.cracked) {
          board.cracked = true;
          if (!bridge.crackClock) { events.push({ type: 'bridge-crack', x: board.body.getPosition().x, y: board.body.getPosition().y, size: 0.5 }); bridge.crackClock = 0.9; }
        }
        if (board.damage >= 1 && bridge.hinges[board.index] && board.index > 0 && board.index < bridge.boards.length - 1) {
          world.destroyJoint(bridge.hinges[board.index]); bridge.hinges[board.index] = null; bridge.broken = true;
          events.push({ type: 'bridge-break', x: board.body.getPosition().x, y: board.body.getPosition().y, size: 1 });
        }
        board.force = 0;
      }
    }
  } };
}
