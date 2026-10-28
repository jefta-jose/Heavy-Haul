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
  or loads to combine, and loads never fall off. A tractor and its semi-trailer, or a prime mover and
  its lowbed, are one image and one rigid body with all their axles.
- Winching belongs to the service trucks: there are no winch posts. A stuck truck calls a fuel or
  breakdown truck sized to its weight (`towMassT`). The player backs it within 5 m, taps WINCH to hook
  the nearest vehicle, and drives away to tow it. The cable never reels in.
- Cars have fixed tires and art. The garage **tuning** panel (`src/game/tuning.js`) scales any car's
  specs: 12 bars from 0 to 100 in steps of 10, where 100 = the knob's `max` multiplier, saved per car
  in the browser. Knobs name
  car.json fields, so new cars need nothing; add a knob there to tune something new.
- Never overwrite Codex's PNG masters. Runtime files are `art/*.webp` from `npm run art:encode`.
- Physics changes need `npm test` and `npm run test:route`; anything visible needs
  `npm run test:browser` and a look at `output/captures/`. Run `npm run check` before reporting done.
- The physics is deterministic. A pure refactor must leave trajectories unchanged, so compare
  before and after.

## Hook up a car

1. **Review the drop** in `source/`: master, body and wheel exist; body and master have identical
   dimensions; the wheel is square and centred; transparency is real, with no halo, checkerboard or
   ground. Look at every image. If one is wrong, write the exact re-generation request for Codex and
   stop.
2. **Measure** the body: hub centres, the fender flare's inner edge (fit `archCircles` `[x, y, r]` in
   body pixels), the ground line and the body length. Choose `pixelsPerMetre` from `lengthM` in
   `cars.json`. Measure the wheel's pivot and artwork radius (tire edge, not canvas margin).
3. **Fit the tires to the arches**: pick the radius and hub height so the tread fills each arch with no
   gap. Composite wheel + body + body-with-arches-cut-out offline and look at it before touching
   the game.
4. **Write `car.json`** with `swamp-scout-4/car.json` as the template:
   - `art`, `rig` (axles front-first in metres, `wheelY`, `radius`, pivots, `archCircles`, exhaust,
     winch and nose points), and the card fields;
   - `physics`: empty mass and centre of mass from `massT`, plus `physics.load` (`massT` from the
     roster, `centreOfMass` at the middle of the load in the art), collision boxes traced from the
     body outline including the load, suspension sized to the loaded weight;
   - `drivetrain`: torque from `powerKw` / `torqueNm` sized for the loaded weight, gears for a
     sensible top speed; for a rig with a trailer drawn in, list the powered axle indices in
     `drivenAxles` (front first, so trailer axles roll free).
   - `audio`: `crankS` and `backupAlarm` retain their existing behavior. Engine voices are recorded
     samples assigned by car ID in `src/audio/engine-dsp.js`; old synthesis parameters are ignored.
     Add a distinct licensed recording for a new playable vehicle; see `assets/audio/README.md`.
     Audition `npm run audio:preview`; do not replace the recordings with engine synthesis.
   - service trucks also get `role`, `size`, `towMassT`, `rig.towRear` (the rear
     winch point) and `physics.winchForce` (about `towMassT × 1000 × 9.81 × 0.7`).
5. `npm run art:encode`, then build with `HAUL_CAR=<id>` and drive it. Use `npm run feel` against
   the approved feel: brisk take-off, smooth drive, and 4×4 / DIFF clearly felt in mud. Heavier
   classes are slower but must still clear the trail with L, 4×4, DIFF and a breakdown truck's
   winch in the heavy-mud pits (`npm run test:route` with `HAUL_CAR=<id>` drives it that way).
6. Check that every wheel sits in its arch at rest and under compression, nothing floats or clips, and
   the close and phone views frame the vehicle. Then set `"status": "playable"` in `car.json` and in
   `cars.json`.

Playable cars appear in the garage automatically. Service trucks (`cars.json` → `service`) are
hooked up the same way and are summoned in play: the game picks the smallest one of that role
whose `towMassT` covers the main truck's loaded weight.

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
folders of removed entries). When something becomes playable, set `status` both in its own JSON and
in the roster. `status: "needs-art"` marks a car whose delivered art has to be regenerated.

Trailers, separate loads and rigging sprites were dropped on 2026-10-26; Codex's drop for them is
archived in `~/heavy-haul-archive/2026-10-26-trailers-loads-rigging/`.

## Hook up a season

Write `season.json` from the swamp-summer template: the trail (keys, zones, waters, heavy-mud pits,
checkpoints, fuel, depot), surfaces, the art map, the bank contact row and lane materials. Trace
`rock-hulls.json` with `tools/art/trace-hulls.py`. Run `npm run test:route` with `HAUL_SEASON=<id>`
and adjust the trail until the reference car clears it.
