# Heavy Haul: working notes for Claude

Codex generates the images (see [AGENTS.md](AGENTS.md)). Claude reviews them, wires them into the
game and tunes until they play well. The user hands over a path such as "hook up
`assets/cars/titan-1`".

Read first: [docs/game-design.md](docs/game-design.md) (cars with their loads, garage, fuel,
service trucks and winching), [README.md](README.md) (code layout and checks), [assets/README.md](assets/README.md)
and the skill [.claude/swamp-scout/SKILL.md](.claude/swamp-scout/SKILL.md) with its references.
[feel-audio-and-performance.md](.claude/swamp-scout/references/feel-audio-and-performance.md)
records the user's feedback on wheels, driving feel, sound and smoothness: keep those rules.

## Ground rules

- Content is data. A car is `assets/cars/<id>/car.json` plus art; a map is `season.json`. Add
  engine features only when the data cannot express something, and keep them generic.
- **Every car carries its load as part of its own art and mass.** There are no separate trailers
  or loads to combine, loads never fall off, and loads are not animated (animated load layers were
  tried and dropped on 2026-10-29). A tractor and its semi-trailer, or a prime mover and
  its lowbed, are one image and one rigid body with all their axles.
- Winching belongs to the breakdown trucks: there are no winch posts, and there is no damage or
  repair. Each class has a fuel truck (refuels only, no winch) and a breakdown truck (winches only).
  The top-bar buttons call the main truck's class's pair, once per run each, from the start of the
  trail; afterwards they switch to them. Back the breakdown truck within 5 m, tap WINCH to hook the
  nearest vehicle, and drive away to tow it. The cable never reels in. Service trucks never get stuck
  and never run out of fuel.
- Cars have fixed tires and art. The garage **tuning** panel (`src/game/tuning.js`) scales any car's
  specs: 5 knobs (engine, suspension, speed, grip, load weight), each 0 to 100 in steps of 25 and each
  moving several car.json fields; every car can max all five. Saved per car in the browser. New cars
  need nothing; extend a knob's `apply` to tune something new.
- Ruts are drawn only (`src/render/layers/mud.js`): they last the run and clear on a new run or the
  garage. Persistent physics ruts were tried and dropped on 2026-10-29 (they made the trail
  impassable after a few passes). Mud sinking is `surfaces.mud.sink` in `season.json`.
  Keep mud fun: a light truck must wiggle through, help is for when it is properly stuck.
- Never overwrite Codex's PNG masters. Runtime files are `art/*.webp` from `npm run art:encode`.
- Physics changes need `npm test` and `npm run test:route`; anything visible needs
  `npm run test:browser` and a look at `output/captures/`. Run `npm run check` before reporting done.
- The physics is deterministic. A pure refactor must leave trajectories unchanged, so compare
  before and after.

## Hook up a car

1. **Review the drop** in `source/`: master, body and wheel exist; body and master have identical
   dimensions; the wheel is square and centred; transparency is real, with no halo, checkerboard or
   ground; and every vehicle image passes the **flat side profile** hard rule in AGENTS.md (equal round
   tires on one level line, rims centred, no far-side tires, no visible cab front, nothing touching the
   canvas edge). Look at every image. If one is wrong, write the exact re-generation request for Codex,
   naming the rule it broke, and stop.
2. **Measure** the body: hub centres, the fender flare's inner edge (fit `archCircles` `[x, y, r]` in
   body pixels), the ground line and the body length. Choose `pixelsPerMetre` from `lengthM` in
   `cars.json`. Measure the wheel's pivot and artwork radius (tire edge, not canvas margin).
3. **Fit the tires to the arches**: pick the radius and hub height so the tread fills each arch with no
   gap. Composite wheel + body + body-with-arches-cut-out offline and look at it before touching
   the game.
4. **Write `car.json`** with `swamp-scout-4/car.json` as the template:
   - `art`, `rig` (axles front-first in metres, `wheelY`, `radius`, pivots, `archCircles`, exhaust,
     winch and nose points), and the card fields;
   - `camera.zoom`: the car's own view, set by the user per car (1.5 = 17.7 m of trail across the
     screen; long rigs need more, e.g. 3.4 for the Ice Breaker, 4.0 for the Mountain Mover). There is
     no zoom button. Check the whole rig fits with room ahead on desktop and phone;
   - `physics`: empty mass and centre of mass from `massT`, plus `physics.load` (`massT` from the
     roster, `centreOfMass` at the middle of the load in the art), collision boxes traced from the
     body outline including the load, suspension sized to the loaded weight;
   - `drivetrain`: torque from `powerKw` / `torqueNm` sized for the loaded weight, gears for a
     sensible top speed; for a rig with a trailer drawn in, list the powered axle indices in
     `drivenAxles` (front first, so trailer axles roll free).
   - sound comes from the car's class: each class has one recorded engine in the sound bank
     (`assets/audio/sounds.json` → `tools/prepare-audio.py` → `assets/audio/bank/`). A car needs no audio
     block; `"audio": { "engine": "<class>" }` picks another class's engine, and `crankS`, `airBrakes`,
     `backupAlarm` override the class's. Never replace recordings with synthesis. See
     `assets/audio/README.md`.
   - service trucks also get `class` (the class they serve), `role` (`fuel` / `breakdown`), `size`,
     `rig.towRear` (the rear winch point) and `physics.neverStuck: true`; breakdown trucks also
     `towMassT` and `physics.winchForce` (about `towMassT × 1000 × 9.81 × 0.7`). Fuel trucks have no
     winch. Tune them to out-pull every car
     of their class in L but stay slower than its fastest (`npm test` checks the roster and the pits).
5. `npm run art:encode`, then build with `HAUL_CAR=<id>` and drive it. Use `npm run feel` against
   the approved feel: brisk take-off, smooth drive, and 4×4 / DIFF clearly felt in mud. Heavier
   classes are slower but must still clear the trail with L, 4×4, DIFF and their own class's
   breakdown-truck winch in the heavy-mud pits (`npm run test:route` with `HAUL_CAR=<id>` drives it that way).
6. Check that every wheel sits in its arch at rest and under compression, nothing floats or clips, and
   the car's `camera.zoom` frames it on desktop and phone. Then set `"status": "playable"` in `car.json` and in
   `cars.json`.

Playable cars appear in the garage automatically. Service trucks (`cars.json` → `service`, a fuel
and a breakdown truck per class) are hooked up the same way; once playable, the top-bar buttons call
them for their class (until then the class's button is greyed out and says "Not available").

`tools/art/measure-vehicle.py <folder> --preview out.png` finds the wheel circles (pixels in the
master missing from the body), the wheel sprite's pivot and radius, and the body outline, and
writes a preview composite. It is a starting point: check every measurement on a gridded crop,
because wheels that overlap fenders or each other confuse it.
When wheels touch each other (multi-axle rigs), find each hub from the tire tops instead.
`tools/art/preview-car.py <folder> out.png --marks` composites a car exactly as the game draws it
from its `car.json` registration: check it before playing. Long rigs need a high cab collision box
(at frame height) so the overhang clears grade changes and boulders.

## Rosters

`assets/cars/cars.json` (5 classes ordered weakest to strongest, tiers within, each car's `load`;
`service` trucks by role and size; `wheel-types.json`) and `assets/hud/hud.json`. After editing a
roster run `npm run scaffold` (`-- --refresh` rewrites README-only folders, `-- --prune` drops
folders of removed entries). A playable car's spec numbers (`massT`, `powerKw`, `torqueNm`,
`topSpeedKmh`, `fuelL`, `tireDiameterM`, load mass) are worked out from its `car.json` whenever content loads
(`tools/lib/specs.js`); the roster's own numbers only count for planned cars. When something becomes playable, set `status` both in its own JSON and
in the roster. `status: "needs-art"` marks a car whose delivered art has to be regenerated.

Trailers, separate loads and rigging sprites were dropped on 2026-10-26; Codex's drop for them is
archived in `~/heavy-haul-archive/2026-10-26-trailers-loads-rigging/`.

## Hook up a season

Write `season.json` from the swamp-summer template: the trail (keys, zones, waters, heavy-mud pits,
checkpoints, depot; no fuel stations: refuelling is by fuel truck only), surfaces, the art map, the bank contact row, lane materials and the
`ambience` zones (forest, swamp, frogs beds and crow calls, by trail position). Trace
`rock-hulls.json` with `tools/art/trace-hulls.py`. Run `npm run test:route` with `HAUL_SEASON=<id>`
and adjust the trail until the reference car clears it.
