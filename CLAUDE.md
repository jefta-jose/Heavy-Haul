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

- **Tuning lives in one file:** `src/game-config.js`, one setting per line. Add new gameplay numbers there. Damage is described in `docs/game-design.md`.

- Content is data. A car is `assets/cars/<id>/car.json` plus art; a map is `season.json`. Add
  engine features only when the data cannot express something, and keep them generic.
- **Every car carries its load as part of its own art and mass.** There are no separate trailers
  or loads to combine, loads never fall off, and loads are not animated (animated load layers were
  tried and dropped on 2026-10-29). A tractor and its semi-trailer, or a prime mover and
  its lowbed, are one image and one rigid body with all their axles.
- Winching belongs to the breakdown trucks: there are no winch posts. Each class has a breakdown truck; fuel trucks were removed on 2026-11-04, and refuelling and repairs happen at fuel stations (`trail.stations`).
  The top-bar button calls the main truck's class's one, once per run, from the start of the
  trail; afterwards they switch to them. Back the breakdown truck within 5 m, tap WINCH to hook the
  nearest vehicle, and drive away to tow it. The cable never reels in. Service trucks never get stuck
  and never run out of fuel.
- Cars have fixed tires and art. The garage **tuning** panel (`src/game/tuning.js`) scales any car's
  specs: 4 knobs (engine, suspension, speed, grip), each 0 to 100 in steps of 25 and each
  moving several car.json fields; every car can max all four. Weight and load are never tuned: each car
  keeps its own (the load-weight knob was removed on 2026-11-03). Saved per car in the browser. New cars
  need nothing; extend a knob's `apply` to tune something new.
- Ruts are drawn only (`src/render/layers/mud.js`): they last the run and clear on a new run or the
  garage. Persistent physics ruts were tried and dropped on 2026-10-29 (they made the trail
  impassable after a few passes). Mud sinking is `surfaces.mud.sink` in `season.json`; bog drag shrinks for
  tires carrying under `bogRefT` tonnes, so light scouts are not held as hard as a laden rig.
  Keep mud fun: a light truck must wiggle through, help is for when it is properly stuck.
- Never overwrite Codex's PNG masters. Runtime files are `art/*.webp` from `npm run art:encode`.
- Physics changes need `npm test` and `npm run test:route`; anything visible needs
  `npm run test:browser` and a look at `output/captures/`. Run `npm run check` before reporting done.
- The physics is deterministic. A pure refactor must leave trajectories unchanged, so compare
  before and after.

## Hook up a car

### Hard rule: integrate efficiently

- Work only on the requested cars. Reuse accepted art, existing car templates, measured hubs
  and saved registrations. Do not regenerate art during integration unless the user requests
  it or a specific visible defect prevents a usable result. Native 1254 px wheel sprites are
  already accepted; do not spend tokens revisiting that exception.
- Review each changed asset once and save measurements. Correct small placement drift with
  the existing export registration; do not repeatedly reread full documents or remeasure
  unchanged assets. Check cab/fender/mirror construction against AGENTS.md before integration.
- Encode only the requested/changed cars with `--cars ... --method 2`; never run a full-library
  export for a car-only change. Do not re-encode unchanged assets during tuning.
- Use a short loaded-driving check to catch setup problems, then run the required checks once
  on the finished batch. Re-run only checks affected by a new fix or an unresolved failure.
  Inspect failures before repeating commands; distinguish pre-existing failures from regressions
  and do not expand into unrelated repairs. Save logs and report concise results instead of
  streaming large files, base64 images or repeated test output into the conversation.
- Playable cars appear on existing maps through the garage automatically. Do not edit map,
  renderer or engine code merely to add a car if data and the existing pipeline suffice.

### Integration steps

1. **Review the drop** in `source/`: master, body and wheel exist; body and master have identical
   dimensions; the wheel is square and centred; transparency is real, with no halo, checkerboard or
   ground; and every vehicle image passes the **flat side profile** hard rule in AGENTS.md (equal round
   tires on one level line, rims centred, no far-side tires, no visible cab front, nothing touching the
   canvas edge). It must also pass the **wheels that make sense** hard rule there: wheels under the load, close tandems, never one lone axle at the end of a long trailer. Look at every image. If one is wrong, write the exact re-generation request for Codex,
   naming the rule it broke, and stop.
   **Hard gate:** require the measured validation record from AGENTS.md's "validate one set before
   spending on a batch" rule. Masters and bodies need a long side of at least 1500 px. Square road
   wheels need at least 1500 px per side, **except native 1254 × 1254 px built-in generator wheels,
   accepted by the user on 2026-11-04**. Do not regenerate or upscale wheels solely for this size.
   All other art checks still apply, and measured length including load must fit 16.8 m.
   Verify body registration as well as dimensions. Prompt claims and a pile of generated files do
   not count as passed review. Never encode, register or mark a failed set playable. Resolve a
   recurring generator limitation on one set before requesting another batch.
   For small source placement drift or transparent-margin differences, a measured
   `art.body.registration` (`canvas` plus output-to-source affine `matrix`) may align the runtime
   body to the master during encoding. Preserve the PNG originals; preview-car.py uses that same
   transform. Validate the registered body and wheel fit before marking it playable. This fixes
   registration, and does not excuse perspective, missing equipment or incorrect axle counts.
2. **Measure** the body: hub centres, the fender flare's inner edge (fit `archCircles` `[x, y, r]` in
   body pixels), the ground line and the body length. Choose `pixelsPerMetre` from `lengthM` in
   `cars.json`. Measure the wheel's pivot and artwork radius (tire edge, not canvas margin).
3. **Fit the tires to the arches**: pick the radius and hub height so the tread fills each arch with no
   gap. Composite wheel + body offline and look at it before touching the game.

   **Hard rule: every axle sits on its painted hub, to within 3 px.** Each `rig.axles[i]` must equal
   `(hubX - bodyOrigin[0]) / pixelsPerMetre`, where `hubX` is the hub centre measured in the
   **master**, never guessed from the arch or the fender. Measure it two ways and make them agree:
   the midpoint of the tire's left and right edges on two or three rows just above the ground line
   (below the body, where only tires are opaque), and the centre of the rim and hub cap on a zoomed,
   gridded crop. When they disagree (uneven tread, a mud flap or step in the row), trust the rim.
   Set that arch circle's `x` to the same `hubX`. Then render `tools/art/preview-car.py` and check
   every tire is centred in its well. Axles measured off by 10-20 px made the wheels sit visibly
   forward or back on the Prime Mover, Interstate, Turnpike, Crossroads, Cedar Hauler and Pioneer
   (fixed on 2026-10-31).
4. **Write `car.json`** with `swamp-scout-4/car.json` as the template:
   - `art`, `rig` (axles front-first in metres, `wheelY`, `radius`, pivots, `archCircles`, exhaust,
     winch and nose points), and the card fields. **Hard rule: `rig.farWheelOffset` is `[0.2, 0.13]` on every
     car**, whatever its size; never tune it per car;
   - camera: one zoom per class, `ZOOM_BY_CLASS` in `src/game-config.js`, tuned by the user (2026-11-06;
     1.5 = 17.7 m of trail across the screen). `camera.zoom` in car.json is only a fallback for a class
     without one. There is no zoom button. Check the whole rig fits with room ahead on desktop and phone;
   - `physics`: empty mass and centre of mass from `massT`, plus `physics.load` (`massT` from the
     roster, `centreOfMass` at the middle of the load in the art), collision boxes traced from the
     body outline including the load, suspension sized to the loaded weight;
   - `drivetrain`: torque from `powerKw` / `torqueNm` sized for the loaded weight, gears for a
     sensible top speed. Every axle is powered, trailer axles included.
   - sound comes from the car's class, service trucks included: each class has one recorded engine in the sound bank
     (`assets/audio/sounds.json` → `tools/prepare-audio.py` → `assets/audio/bank/`). A car needs no audio
     block; `"audio": { "engine": "<class>" }` picks another class's engine, and `crankS`, `airBrakes`,
     `backupAlarm` override the class's. Never replace recordings with synthesis. See
     `assets/audio/README.md`.
   - service trucks also get `class` (the class they serve), `role` (`breakdown`), `size`,
     `rig.towRear` (the rear winch point) and `physics.neverStuck: true`; breakdown trucks also
     `towMassT` and `physics.winchForce` (about `towMassT × 1000 × 9.81 × 0.7`). Tune them to out-pull every car
     of their class in L but stay slower than its fastest (`npm test` checks the roster and the pits).
5. `npm run art:encode`, then build with `HAUL_CAR=<id>` and drive it. Use `npm run feel` against
   the approved feel: brisk take-off, smooth drive, and AWD / DIFF clearly felt in mud. Heavier
   classes are slower but must still clear the trail with L, AWD, DIFF and their own class's
   breakdown-truck winch in the heavy-mud pits (`npm run test:route` with `HAUL_CAR=<id>` drives it that way).
   **For a car-only drop, scope the export:** `npm run art:encode -- --cars <id> <id> --method 2`.
   This retains quality 94 and source dimensions while reducing compression effort; it skips
   unrelated cars, seasons and HUD art. Reuse measured registrations and run checks once after
   the batch. Regenerate only an actual visible defect, never an accepted resolution exception
   or placement drift that can be corrected and verified at export.
6. Check that every wheel sits in its arch at rest and under compression, nothing floats or clips, and
   its class's `ZOOM_BY_CLASS` frames it on desktop and phone. Then set `"status": "playable"` in `car.json` and in
   `cars.json`.

Playable cars appear in the garage automatically. Service trucks (`cars.json` → `service`, a breakdown
truck per class) are hooked up the same way; once playable, the top-bar buttons call
them for their class (until then the class's button is greyed out and says "Not available").

`tools/art/measure-vehicle.py <folder> --preview out.png` finds the wheel circles (pixels in the
master missing from the body), the wheel sprite's pivot and radius, and the body outline, and
writes a preview composite. It is a starting point: check every measurement on a gridded crop,
because wheels that overlap fenders or each other confuse it. It cannot find wheels in bodies whose
wheel wells are painted in (the current rule), so measure hubs in the master as in step 3.
When wheels touch each other (multi-axle rigs), find each hub from the tire tops instead.
`tools/art/preview-car.py <folder> out.png --marks` composites a car exactly as the game draws it
from its `car.json` registration: check it before playing. Long rigs need a high cab collision box
(at frame height) so the overhang clears grade changes and boulders.
`tools/art/draft-rig.py <folder> --tire-m <roster tire>` drafts the `rig` (hubs, arches, origin, nose) and
collision boxes from those circles (`--hubs x,... --hub-y Y --tire-px R` when tires merge). Its chassis
box sits at the body's lowest edge: raise it to about one tire radius above the hubs for anything long,
or the rig bellies out on crests and the pipe runs. Tires under about 1.3 m cannot climb the swamp trail's pipes: pick `pixelsPerMetre`
so the drawn tires reach that size.

## Garage and loading screens

Heavy, dark and SnowRunner-inspired, on the user's direction (2026-11-04): an arcade look with rays, gloss and bouncing was built and rejected as wrong for the name Heavy Haul. Keep motion slow, and keep the empty space filled: seasons, classes and cars across the top, specs and Drive on the bar along the floor. See `docs/game-design.md`.

## Rosters

`assets/cars/cars.json` (5 classes ordered weakest to strongest, tiers within, each car's `load`;
`service` trucks by role and size; `wheel-types.json`) and `assets/hud/hud.json`. After editing a
roster run `npm run scaffold` (`-- --refresh` rewrites README-only folders, `-- --prune` drops
folders of removed entries). A playable car's spec numbers (`massT`, `powerKw`, `torqueNm`,
`topSpeedKmh`, `fuelL`, `tireDiameterM`, load mass) are worked out from its `car.json` whenever content loads
(`tools/lib/specs.js`); the roster's own numbers only count for planned cars. When something becomes playable, set `status` both in its own JSON and
in the roster. Each roster car also has an `unlockRank` (1 to 20, one per rank in each class, weakest by power first; rank 1 is the free starter) and a `price` (its class's base times that rank): keep both when adding or reordering cars. `status: "needs-art"` marks a car whose delivered art has to be regenerated.

Trailers, separate loads and rigging sprites were dropped on 2026-10-26; Codex's drop for them is
archived in `~/heavy-haul-archive/2026-10-26-trailers-loads-rigging/`.

**Size cap (2026-11-04): nothing is longer than 16.8 m, load included.** Obstacles are one size for every truck, so a longer rig would need a higher zoom and the road would look like a model.
The cap is the top-level `maxLengthM` in `cars.json`, and `npm test` enforces it. The heavy class's art and registrations were deleted on
2026-11-04: its 20 cars and 2 service trucks are planned again, to be redrawn within the cap, and so are the Ice Breaker and ten highway trucks rejected for their wheels or bodies (each README says why). Do not add per-truck world scaling.

## Hook up a season

**Blackwater Swamp is the reference for every map.** Study [`assets/seasons/swamp-summer/README.md`](assets/seasons/swamp-summer/README.md)
and its `season.json`, and follow the recipe at the end of that README. [`assets/seasons/SKILL.md`](assets/seasons/SKILL.md) has the art
prompts and the checks.

The recipe: a simple, life-giving panorama (`render.backdropHorizon`, no tree layer, no haze), a thick road (`render.road`:
drawing only, tires still roll on `visH`), rolling bumps on every open stretch (`trail.rollers`), lots of breakables on rock and dirt
(`trail.crushables`), huge logs, rocks and pipes (`trail.obstacleScale`, `trail.obstacleRuns`), and deep bogs with one mud hole
each and none elsewhere (`trail.heavyMud`, `trail.holes`). The swamp has no bridges, water, painted bank or fallen trees. Run
`npm run test:route` with `HAUL_SEASON=<id>` and adjust the trail until a scout and the longest truck clear it.
