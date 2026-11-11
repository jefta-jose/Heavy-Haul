# Blackwater Swamp: the reference season

**This is the season every new map copies.** To build a new map, study this file, then `season.json` in this
folder, then copy the recipe at the end. Everything described here is data in `season.json` or a generic engine
feature, so a new season should need new art and new numbers, not new code.

Companion guide for generating and checking the art: [`../SKILL.md`](../SKILL.md).

## The idea

A simple, life-giving background behind a thick, detailed road. The road is never boring: where there is nothing
else to do, it rolls in uneven humps. It is broken up by deep bogs, huge logs, rocks and pipes, and plenty of things
that smash under the tires. After every fuel station comes a short smooth highway to open up on, and the
roadside tells the place's story: abandoned shacks, wrecks, fences and warning signs.

| Ingredient | Where it lives | Code |
|---|---|---|
| [Life-giving background](#1-life-giving-background) | `art.backdrop`, `render.backdropHorizon`, `render.backdropFloor`, `render.midground: false` | `src/render/layers/background.js`, `src/render/sprite-cache.js` |
| [Thick road](#2-thick-road) | `render.road`, `art.roadFar`, `art.roadEdge`, `art.roadSoil`, `render.lane` | `src/render/layers/ground.js` |
| [Bumpy roads](#3-bumpy-roads) | `trail.rollers` | `rollersAt()` in `src/physics/terrain.js` |
| [Breakables](#4-breakables) | `trail.crushables`, `obstacleKinds.*.crush`, `propKinds.*.crush` | `src/physics/obstacles.js` |
| [Huge logs, rocks and pipes](#5-huge-logs-rocks-and-pipes) | `trail.obstacleScale`, `trail.obstacleRuns`, `trail.rockGardens`, `trail.props` | `src/physics/obstacles.js`, `src/render/layers/props.js` |
| [Deep bogs and mud holes](#6-deep-bogs-and-mud-holes) | `trail.heavyMud`, `trail.holes`, `surfaces.mud` | `src/physics/terrain.js`, `src/render/layers/mud.js`, `src/render/layers/props.js` |
| [Fuel stations](#7-fuel-stations) | `trail.stations`, `art.fuelStation` | `src/physics/terrain.js`, `src/physics/simulation.js`, `src/render/layers/props.js` |
| [Highways and speed cameras](#8-highways-and-speed-cameras) | `trail.highways`, `surfaces.highway`, `art.highwaySign` | `src/physics/terrain.js`, `src/physics/obstacles.js`, `src/game/speed-trap.js`, `src/render/layers/props.js` |
| [Speed limit signs](#9-speed-limit-signs) | `art.speedSign` (worked out from the obstacles) | `src/physics/obstacles.js`, `src/render/layers/props.js` |
| [Roadside scenery](#10-roadside-scenery) | `trail.scenery`, its `art` entries | `src/render/layers/props.js`, `src/render/sprite-cache.js` |

## 1. Life-giving background

One opaque painted panorama, and nothing else behind the road. It is simple (flat shapes, soft gradients, little
fine texture), but it carries the season's life: a warm sun with rays, a blue sky with clouds, big characterful
trees, layers of hazy forest, still water with lily pads and reeds. This is what makes the season feel alive, so it
gets no fog, tint or second tree layer on top.

- `art.backdrop` (master `source/backdrop-v4.png`, 2172×724): the top two thirds is the scene, the bottom third a
  flat calm band of one colour.
- `render.backdropHorizon: 0.665`: how far down the image its waterline sits. The engine sizes the image so its top
  meets the top of the screen and this line sits just under the road's far edge, on every screen shape. Measure it
  for each new panorama.
- `render.backdropFloor: "#8a9b7c"`: the colour below the image, for when the road dips low. Sample it from the
  panorama's bottom edge.
- `render.midground: false` and no `art.midground`: the panorama already has its trees. Setting
  `render.backdropHorizon` also turns the old baked-in haze off.
- `render.parallax.backdrop: 0.055`: it drifts slowly and mirrors at each repeat, so its side edges need not match.

## 2. Thick road

A thick band of road around the single line the tires roll on, drawn the same way as side-scrolling hill-climb games.
This replaced a painted bank image, and it is **drawing only**: tires still roll on `visH`.

Back to front:

1. **Far edge** (`art.roadFar`): reeds and grass along the back of the road. Transparent above, with a straight
   opaque bottom that tucks behind the road.
2. **Road surface**: the lane materials (`art.ground`, `art.wetmud`, `art.granite`, chosen per surface in
   `render.lane.materials` and tinted by `render.lane.tints`), over an opaque base. The highway reuses `granite` under
   a dark tint, so it reads as asphalt with no art of its own.
3. **Front edge** (`art.roadEdge`): a lip of moss, roots and wet clay with drips hanging off the bottom.
4. **Earth** (`art.roadSoil`): plain dark soil down past the bottom of the screen. It is calm on purpose, because the
   pedals and dials sit on top of it.

```json
"road": { "far": 0.12, "near": 0.1, "edge": 0.09, "farEdge": 0.1, "soilTileM": 18 }
```

`far`, `near`, `edge` and `farEdge` are **shares of the screen height**, not metres, so the road looks equally thick at
every truck's zoom. `far` is road behind the tire line, `near` is road in front of it. `soilTileM` is the metres the
soil image covers before it repeats. The soil is mirrored both ways in code, so its shading never shows a seam.

The edge strips are cut into thin columns and bent along the road, and every other tile is mirrored, so they follow
every hump and show no join. Never ask for one long painting of the road: it could not bend.

Also tied to the road: back props such as reeds, stations, signs and scenery stand on its far edge, and nothing grows
in front of it. Mud patches spread across its full width. The road is painted with marks that the tires repaint over
(the station bays), so they never vanish under a sunk tire.

## 3. Bumpy roads

Every open stretch rolls, so the drive stays fun when there is no bog or obstacle in sight.

```json
"rollers": { "seed": 7717, "height": [0.45, 0.85], "wave": [6.5, 11], "fade": 2.5, "mud": 0.85, "intensity": 1.5 }
```

- `height`: trough to crest in metres, picked per hump, then scaled by `intensity`. Short humps are lowered so they
  never get too steep.
- `wave`: trough to trough in metres. Each crest falls off-centre, so no two humps match.
- `fade`: metres over which bumps fade out next to anything that must stay level.
- `mud`: strength in ordinary mud.
- `seed`: bumps have their own random stream, so changing them does not move other features.

They are kept off bog pits, holes, rock gardens, ramps, obstacle runs, props, steps and slabs, as well as the start,
the depot, the stations, the highways and `trail.recoverySections`. Everything else is computed for you, so a new
season only sets these numbers. Bumps change the physics, so run the route test after changing them.

## 4. Breakables

Lots of things smash under the tires, so a truck feels heavy and the road feels busy.

```json
"crushables": { "rock": [2.5, 5], "dirt": [4, 8], "room": 0.4, "pileEvery": 3 }
```

- `rock`, `dirt`: metres between breakables on that surface (minimum, maximum). Any surface can be listed.
- `room`: clearance from the nearest rock.
- `pileEvery: 3`: every third one is a branch pile instead of a stone.
- Hard boulders are placed at half their usual rate where breakables are listed, and every other small stone in a rock
  garden breaks too.

The swamp ends up with 40 breakable stones on dirt and 22 on rock (rock gardens included), 36 hard ones (29 of them in
the rock gardens), and 37 branch piles. The highways add 92 more breakable stones of their own (section 8).

Round and traced obstacles break by data. `"crush": { "impulse": 250 }` sets how hard a hit it takes, and
`"minMassT": 15` limits it to trucks that heavy. Stones use the default of 900 N·s. In the swamp, `branchPile` breaks
easily and `rottenLog` only for trucks over 15 t. Anything every truck can break does no damage, so it gets no speed
limit sign.

## 5. Huge logs, rocks and pipes

Obstacles are big enough to read at game scale and to work the suspension.

- `trail.obstacleScale: 2`: everything round or traced is doubled. Logs and pipes come out at 0.52 m radius, and rocks
  run 1.4–4.4 m wide.
- `trail.obstacleRuns` (15 runs, 75 obstacles): each crossing is 4 to 6 round obstacles in a line on the ground,
  never one alone and never stacked. `gaps` is clear space between them: tight gaps give a sustained rolling climb, and
  gaps up to about 2 m let the tires drop and bounce. Kinds are `log`, `corduroyLog`, `rottenLog`, `pipe` and `oilDrum`.
- `trail.rockGardens` (10): repeated low stones with an occasional big one.
- `trail.props` (39 placed, plus the branch piles from `pileEvery`): traced shapes `rootTangle`, `concreteSlab` and
  `branchPile`, defined in `trail.propKinds` with their collision hulls.
- `render.obstacles`: where each round sprite's near face is, in source pixels, so art lines up with its physics circle.
- **Two wheel tracks:** a rock or prop is drawn twice, on the near track and again on the far track behind the truck, because one flat image cannot span the road. The far copy has no collision of its own: the far tire rides with the near one, so it rises over it at the same moment. Round sprites already recede across the road.

A truck has to get over these, so size them against tires: tires under about 1.3 m
cannot climb the pipes. Trucks are capped at 16.8 m (see `CLAUDE.md`), so obstacles are one size for everyone. A bigger scale or a new kind needs route tests. Keep the launch area, the stations and the highways clear.

## 6. Deep bogs and mud holes

- `trail.heavyMud` (10 pit centres): each pit is about 20 m long, sunk by `surfaces.mud.sink` plus `heavySink`, and held
  by `bog`, `suction` and `heavyDrag`. Light tires are held less (`bogRefT`). L, AWD and DIFF matter here, and a bad
  run needs the breakdown truck, but service trucks must always cross. There are about 980 m of mud zones in all.
- `trail.holes` (10): **one mud hole per pit, and none anywhere else.** They are 0.3 m deep, and deeper ones stopped
  service trucks. The drawn size does not depend on that depth: on a thick road the art keeps its true proportions and
  is sized to the road, drawn on top of the mud with its near half over the tires.
- **Both tires sink:** near tires are buried by the front lip, and far tires by a lip of their own, drawn before the truck's body (`drawFarLip` in `ground.js`).
- The dark `art.deepMud` material spreads across the road where the pit is, so a bog reads before it slows you.
- An alligator warning sign stands about 22 m before every pit (section 10).

## 7. Fuel stations

`trail.stations` (4, 812 m apart, at 520, 1332, 2144 and 2956 m): the only place to refuel and repair. The first is
490 m from the start and the last 574 m from the depot. Keep them evenly spaced on clear, firm ground, out of the mud,
and leave room after each one for its highway. The bumps smooth out around each one, but the trail's slope stays, and
the building leans with it (`STATION_WIDTH_M` in `src/game-config.js`). A truck stopped in the marked bay fills up; a dry
or badly damaged one gets towed there by the breakdown truck. The bay is a soft tinted patch with no painted edges. The
building is `art.fuelStation`, and a plain drawn stand-in shows until a season has one. Timing is in
`src/game-config.js`.

## 8. Highways and speed cameras

Right after each station comes 400 m of highway, then normal road again: four in all, 1.6 km of the 4.1 km trail. They
are the place to open up.

```json
{ "x0": 528, "x1": 778, "sign": "highwaySign",
  "waves": { "seed": 4471, "height": [1.8, 3], "wave": [60, 90] } }
```

- `x0`, `x1`: where it starts and ends. Each starts at the end of its station's bay (`station.x + 8`), and a `highway`
  zone covers the same stretch.
- `waves`: the ground has no noise, features or rollers, only long smooth rises and dips, heights and lengths in metres
  as `[min, max]`, with the first and last 20 m flat. Give each highway its own `seed`. The steepest stays under about
  0.2 and the tightest bend under 0.02, so trucks hold their speed with no jolts. Even the ground out under each one
  with two `keys` at `x0` and `x1`, because a steep stretch of trail plus waves gets too steep.
- Nothing stands on it: no stones, logs, props or speed limit signs, so it stays clean. (`rockEvery` and `rockImpulse` can add
  stones any truck breaks on touch, but the swamp's highways have none.)
- `sign`: the art key of the sign standing at its start (`art.highwaySign`, `HIGHWAY_SIGN_WIDTH_M` wide).
- An invisible **speed camera** stands `SPEED_TRAP_FROM_END_M` (20 m) before its end, where trucks are at
  their fastest. As the main truck drives past it, a small fiery chip under the power chip shows its speed at that moment
  for a few seconds (`SPEED_TRAP_CARD_S`), once per camera per run. Nothing is saved.
- `surfaces.highway`: good grip, low rolling drag and no noise.

Keep obstacles, gardens, ramps, holes and bogs off the highways, and keep a station's last obstacle well before it.

## 9. Speed limit signs

A sign stands at the first of every group of things that can hurt a truck: logs, pipes, drums, hard rocks and solid
props. There are 37 in the swamp. They are worked out from the obstacles themselves, so a new map needs no sign data,
only the art.

- The number painted on the blank face is `DAMAGE_START_KMH` from `src/game-config.js`, the speed above which a hit
  does damage. Change it there and every sign follows.
- `art.speedSign.face` is the white circle `[x, y, r]` in cropped pixels, where the number goes.
- Obstacles closer together than `SPEED_SIGN_AREA_GAP_M` share one sign, and a sign that would stand on a station's
  building moves just before it. Breakables every truck can crush get none.

## 10. Roadside scenery

Pieces that tell the place's story stand along the road's far edge. They are **drawing only**: trucks never touch
them, so they cannot change a route.

```json
{ "art": "gatorSign", "x": 158 }
{ "art": "fenceSection", "x": 816, "count": 3 }
```

`trail.scenery` is a list of `{ art, x }`, or `{ art, x, count }` for repeated sections. Each piece's `art` entry gives:

- `heightM`: how tall it is drawn. Keep the tallest under about 7.5 m, or it goes off the top of the screen and behind
  the HUD, and remember a phone shows less height above the road than a desktop.
- `lean: true`: it tilts with the ground, for long low pieces. Others stand upright, sunk at their lowest ground so no
  side floats.
- `repeatPx`: the distance between a section's end posts, so repeated fence sections join post to post.

The swamp has 27:

| Piece | Art | Count | Height | Where |
|---|---|---|---|---|
| Electric fence | `fenceSection` | 6 runs of 2 or 3 | 1.6 m | Along the open dirt |
| Rusted pickup | `rustedPickup` | 6 | 1.95 m, leans | Spread along the trail |
| Alligator warning sign | `gatorSign` | 10 | 3.6 m | About 22 m before every deep bog |
| Stilt shack | `stiltShack` | 3 | 6 m | Now and then |
| Water tower | `waterTower` | 2 | 7.5 m | Rare landmarks, one in each half |

Place big pieces rarely and small ones often. Keep every piece clear of station buildings, highway signs and cameras,
speed limit signs, the start and the depot. `npm test` checks this.

## What this season deliberately leaves out

All tried here and dropped. Do not bring them back unless asked.

| Dropped | Why |
|---|---|
| Painted bank image and thin lane | The thick road replaced it |
| Semi-transparent tree layer and baked haze | They washed out the panorama |
| Bridges | Dropped for bogs. The engine still supports `trail.bridges`, but their art is gone from this season |
| Water and rivers | Replaced by deep bog. The engine still draws `trail.waters` as pools on a thick road, with `cut` digging the bed |
| Fallen trees on the road's edge | They added nothing |
| Plants and logs in front of the road | They floated on the soil |
| Reflections, shadows under vehicles, per-truck world scaling | Rejected. Heavy trucks will be redrawn within the size cap instead |
| Superpower pickups on the trail | Replaced by the powers chosen in the garage |
| Black and white striped station bay edges | Removed for a plain tinted bay |
| One long highway at the end | Replaced by a short one after every station, so there is somewhere to open up |
| A zoom and slow motion at the speed camera, and saved top speeds | The animation froze the game and felt wrong. Now just the card, with nothing remembered |
| Small rocks and twigs scattered on the road | They did not sit well in the side view, on or off the wheel tracks |

`surfaces.creek` and `wood` remain as engine surfaces. No zone uses `creek` any more.

## Art

The game loads only the runtime files in `art/`. The `source/` masters were deleted on 2026-11-06 to keep the project
small, so the `art/*.webp` files are now the only copies: never delete or overwrite them. Each `art` entry still names the
master it was encoded from. To add new art, put its PNG in `source/` and run
`npm run art:encode -- --art <key> <key> --method 4`. Always pass `--art`, because the other entries' masters are gone.

| Role | `art` key | Master | Type |
|---|---|---|---|
| Panorama | `backdrop` | `backdrop-v4.png` | Opaque |
| Road far edge | `roadFar` | `road-far-v1.png` | Transparent strip, cropped in `art` |
| Road front edge | `roadEdge` | `road-edge-v1.png` | Transparent strip, cropped in `art` |
| Earth | `roadSoil` | `road-soil-v1.png` | Opaque |
| Dirt and gravel surface | `ground` | `ground-v1.png` | Opaque top-down tile |
| Mud surface | `wetmud` | `wet-mud-v1.png` | Opaque top-down tile |
| Rock and highway surface | `granite` | `granite-v1.png` | Opaque top-down tile |
| Deep bog | `deepMud` | `deep-mud-v2.png` | Opaque top-down tile |
| Mud hole | `mudHole` | `mud-hole-v1.png` | Transparent |
| Fuel station | `fuelStation` | `fuel-station-v1.png` | Transparent |
| Highway sign | `highwaySign` | `highway-sign.png` | Transparent |
| Speed limit sign | `speedSign` | `speed-sign.png` | Transparent, with a blank face; `face` is its white circle `[x, y, r]` in cropped pixels |
| Fence section | `fenceSection` | `fence-section.png` | Transparent; `repeatPx` is the distance between its end posts, so sections join up |
| Stilt shack | `stiltShack` | `mossy-porch.png` | Transparent |
| Rusted pickup | `rustedPickup` | `rusted-pickup.png` | Transparent |
| Water tower | `waterTower` | `water-tower.png` | Transparent |
| Gator sign | `gatorSign` | `warning-sign.png` | Transparent |
| Roadside plant | `reeds` | `reeds-v4.png` | Transparent |
| Rock and breakable stone | `rock` | `rock-v2.png` | Transparent, hulls in `rock-hulls.json` |
| Round obstacles | `logCrossing`, `corduroyLog`, `rottenLog`, `pipe`, `oilDrum` | Same name in `source/` | Transparent |
| Traced props | `rootTangle`, `concreteSlab`, `branchPile` | Same name in `source/` | Transparent |

An `art` entry can also set `crop` ([left, top, right, bottom] in source pixels), `width` and `quality`, for art that
should be trimmed or kept small, and `alphaFloor` (24 in the swamp): pixels fainter than it go fully clear, which removes
the faint glow image generators leave around transparent art.

**Generated art:** ask for a flat side view, a real transparent background with nothing touching the canvas edge, no
ground, shadow or glow, no text unless the piece needs it (then check the spelling), and a blank face where the game
draws its own number. Check every image on a mid-coloured background before using it, and measure its visible bounds for
`crop`.

## The trail

4.1 km from `start: 30` to `depot: 4130`, with a `finishBonus` of 4800 coins.

- `keys`: the hills, as [metres, height] pairs, from about −3 m to 34 m. There are no steep walls, and each highway has
  a key at each end so it runs at a gentle grade.
- `zones`: stretches of `dirt`, `rock`, `mud`, `highway` and `gravel`, with `gravel` only at the depot. Mud covers the
  old river stretches too.
- `checkpoints`: 6, and `recoverySections`: 13 short calm spots.
- `ramps`: 6 low rock ledges.
- `seed`, `obstacleSeed`: the map's random layout.
- `ambience`: forest everywhere, plus frog and crow zones by position.

The order a run meets things: a rough opening with bogs and log runs, then a station, its highway, rough trail with
bogs, the next station and highway, and so on four times, then a last rough stretch to the depot.

## Build a new season from this

1. **Copy the data.** Copy `season.json` to `assets/seasons/<id>/` and set `id`, `name`, `season` and `status: "planned"`.
   Leave the other season folders alone.
2. **Make the art** using the table above and the prompts in [`../SKILL.md`](../SKILL.md). Change vegetation, palette
   and materials for the season, and keep the roles the same. Start with the panorama, because it sets the mood. Make
   roadside scenery and signs that fit the season's story, in place of the swamp's shacks and gator signs.
3. **Point `art` at it** and encode it. Measure the panorama's waterline for `render.backdropHorizon` and sample its
   bottom colour for `render.backdropFloor`. Crop the edge strips to their visible rows, with the road line at the top
   of the front edge and the straight bottom at the bottom of the far edge. Trace rocks with `tools/art/trace-hulls.py`,
   record each round sprite's near face in `render.obstacles`, and the speed sign's blank face in `art.speedSign.face`.
4. **Lay out the trail.** Change `keys`, `zones`, pits, runs, gardens, props and seeds so the map has its own character.
   Keep one hole per pit. Set `surfaces` for the season: traction and sink are what make ice feel unlike mud.
5. **Place the stations and highways.** Space the stations evenly on firm ground, about 800 m apart, and start a 400 m
   highway at the end of each bay. Keep every obstacle, garden, ramp, hole and bog off the highways, give each its own
   wave seed, and even out the ground under each with keys at its ends.
6. **Add the scenery.** Big landmarks rarely, small pieces often, a warning sign before each bog, and nothing on a
   station, highway sign or camera, or speed limit sign. Speed limit signs place themselves.
7. **Keep the recipe.** Thick road, rolling bumps, breakables on the firm surfaces, huge obstacles, a simple living
   panorama, smooth highways after the stations. Start from the swamp's numbers and tune from there.
8. **Check it.** Run `npm run build` with `HAUL_SEASON=<id>` and look at it on phone and desktop. Then run
   `HAUL_SEASON=<id> npm run test:route` for a scout and the longest truck, adjust the trail until both clear it, and set
   `status: "playable"`. Some tests in `tests/` use swamp positions, so expect to adapt them for a season they cover.
