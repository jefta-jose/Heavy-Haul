# Blackwater Swamp: the reference season

**This is the season every new map copies.** To build a new map, study this file, then `season.json` in this
folder, then copy the recipe at the end. Everything described here is data in `season.json` or a generic engine
feature, so a new season should need new art and new numbers, not new code.

Companion guide for generating and checking the art: [`../SKILL.md`](../SKILL.md).

## The idea

A simple, life-giving background behind a thick, detailed road. The road is never boring: where there is nothing
else to do, it rolls in uneven humps. It is broken up by deep bogs, huge logs, rocks and pipes, and plenty of things
that smash under the tires.

| Ingredient | Where it lives | Code |
|---|---|---|
| [Life-giving background](#1-life-giving-background) | `art.backdrop`, `render.backdropHorizon`, `render.backdropFloor`, `render.midground: false` | `src/render/layers/background.js`, `src/render/sprite-cache.js` |
| [Thick road](#2-thick-road) | `render.road`, `art.roadFar`, `art.roadEdge`, `art.roadSoil`, `render.lane` | `src/render/layers/ground.js` |
| [Bumpy roads](#3-bumpy-roads) | `trail.rollers` | `rollersAt()` in `src/physics/terrain.js` |
| [Breakables](#4-breakables) | `trail.crushables`, `obstacleKinds.*.crush`, `propKinds.*.crush` | `src/physics/obstacles.js` |
| [Huge logs, rocks and pipes](#5-huge-logs-rocks-and-pipes) | `trail.obstacleScale`, `trail.obstacleRuns`, `trail.rockGardens`, `trail.props` | `src/physics/obstacles.js`, `src/render/layers/props.js` |
| [Deep bogs and mud holes](#6-deep-bogs-and-mud-holes) | `trail.heavyMud`, `trail.holes`, `surfaces.mud` | `src/physics/terrain.js`, `src/render/layers/mud.js`, `src/render/layers/props.js` |

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
   `render.lane.materials` and tinted by `render.lane.tints`), over an opaque base.
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

Also tied to the road: back props such as reeds stand on its far edge, and nothing grows in front of it. Mud patches
spread across its full width.

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
the depot and `trail.recoverySections`. Everything else is computed for you, so a new season only sets these numbers.
Bumps change the physics, so run the route test after changing them.

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

The swamp ends up with 41 breakable and 30 hard rocks on rock, and 77 breakable and 38 hard on dirt.

Round and traced obstacles break by data. `"crush": { "impulse": 250 }` sets how hard a hit it takes, and
`"minMassT": 15` limits it to trucks that heavy. Stones use the default of 900 N·s. In the swamp, `branchPile` breaks
easily and `rottenLog` only for trucks over 15 t.

## 5. Huge logs, rocks and pipes

Obstacles are big enough to read at game scale and to work the suspension.

- `trail.obstacleScale: 2`: everything round or traced is doubled. Logs and pipes come out at 0.52 m radius, and rocks
  run 1.4–4.4 m wide.
- `trail.obstacleRuns` (32 runs, 153 obstacles): each crossing is 4 to 6 round obstacles in a line on the ground,
  never one alone and never stacked. `gaps` is clear space between them: tight gaps give a sustained rolling climb, and
  gaps up to about 2 m let the tires drop and bounce. Kinds are `log`, `corduroyLog`, `rottenLog`, `pipe` and `oilDrum`.
- `trail.rockGardens` (10): repeated low stones with an occasional big one.
- `trail.props` (52): traced shapes `rootTangle`, `concreteSlab` and `branchPile`, defined in `trail.propKinds` with
  their collision hulls.
- `render.obstacles`: where each round sprite's near face is, in source pixels, so art lines up with its physics circle.
- **Two wheel tracks:** a rock or prop is drawn twice, on the near track and again on the far track behind the truck, because one flat image cannot span the road. The far copy has no collision of its own: the far tire rides with the near one, so it rises over it at the same moment. Round sprites already recede across the road.

A truck has to get over these, so size them against tires: tires under about 1.3 m
cannot climb the pipes. Trucks are capped at 16.8 m (see `CLAUDE.md`), so obstacles are one size for everyone. A bigger scale or a new kind needs route tests. Keep the launch area clear.

## 6. Deep bogs and mud holes

- `trail.heavyMud` (14 pit centres): each pit is about 20 m long, sunk by `surfaces.mud.sink` plus `heavySink`, and held
  by `bog`, `suction` and `heavyDrag`. Light tires are held less (`bogRefT`). L, 4×4 and DIFF matter here, and a bad
  run needs the breakdown truck, but service trucks must always cross.
- `trail.holes` (14): **one mud hole per pit, and none anywhere else.** They are 0.3 m deep, and deeper ones stopped
  service trucks. The drawn size does not depend on that depth: on a thick road the art keeps its true proportions and
  is sized to the road, drawn on top of the mud with its near half over the tires.
- **Both tires sink:** near tires are buried by the front lip, and far tires by a lip of their own, drawn before the truck's body (`drawFarLip` in `ground.js`).
- The dark `art.deepMud` material spreads across the road where the pit is, so a bog reads before it slows you.

## 7. Fuel stations

`trail.stations` (5, at 815, 1290, 1740, 2478 and 2996 m): the only place to refuel and repair. Keep them on clear ground, none more than about 800 m apart, and the terrain flattens itself around each one. A truck stopped in the marked bay fills up; a dry or badly damaged one gets towed there by the breakdown truck. The building is `art.fuelStation`, and a plain drawn stand-in shows until a season has one. Timing is in `src/game-config.js`.

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

`surfaces.creek` and `wood` remain as engine surfaces. No zone uses `creek` any more.

## Art

Masters are in `source/`, and runtime files in `art/` are built by `npm run art:encode`. `source/prompts.json` is the
older generation history and still mentions art deleted since.

| Role | `art` key | Master | Type |
|---|---|---|---|
| Panorama | `backdrop` | `backdrop-v4.png` | Opaque |
| Road far edge | `roadFar` | `road-far-v1.png` | Transparent strip, cropped in `art` |
| Road front edge | `roadEdge` | `road-edge-v1.png` | Transparent strip, cropped in `art` |
| Earth | `roadSoil` | `road-soil-v1.png` | Opaque |
| Dirt and gravel surface | `ground` | `ground-v1.png` | Opaque top-down tile |
| Mud surface | `wetmud` | `wet-mud-v1.png` | Opaque top-down tile |
| Rock surface | `granite` | `granite-v1.png` | Opaque top-down tile |
| Deep bog | `deepMud` | `deep-mud-v2.png` | Opaque top-down tile |
| Mud hole | `mudHole` | `mud-hole-v1.png` | Transparent |
| Fuel station | `fuelStation` | `fuel-station-v1.png` | Transparent |
| Roadside plant | `reeds` | `reeds-v4.png` | Transparent |
| Rock and breakable stone | `rock` | `rock-v2.png` | Transparent, hulls in `rock-hulls.json` |
| Round obstacles | `logCrossing`, `corduroyLog`, `rottenLog`, `pipe`, `oilDrum` | Same name in `source/` | Transparent |
| Traced props | `rootTangle`, `concreteSlab`, `branchPile` | Same name in `source/` | Transparent |

An `art` entry can also set `crop` ([left, top, right, bottom] in source pixels), `width` and `quality`, for art that
should be trimmed or kept small.

## The trail

3.5 km from `start: 30` to `depot: 3530`.

- `keys`: the hills, as [metres, height] pairs. There are no steep walls.
- `zones`: stretches of `dirt`, `rock`, `mud` and `gravel` in turn. Mud covers the old river stretches too.
- `checkpoints`: 6, and `recoverySections`: 13 short calm spots.
- `ramps`: 6 low rock ledges.
- `seed`, `obstacleSeed`: the map's random layout.
- `ambience`: forest everywhere, plus frog and crow zones by position. There is no fuel station: fuel comes by truck.

## Build a new season from this

1. **Copy the data.** Copy `season.json` to `assets/seasons/<id>/` and set `id`, `name`, `season` and `status: "planned"`.
   Leave the other season folders alone.
2. **Make the art** using the table above and the prompts in [`../SKILL.md`](../SKILL.md). Change vegetation, palette
   and materials for the season, and keep the roles the same. Start with the panorama, because it sets the mood.
3. **Point `art` at it** and run `npm run art:encode`. Measure the panorama's waterline for `render.backdropHorizon` and
   sample its bottom colour for `render.backdropFloor`. Crop the edge strips to their visible rows, with the road line at
   the top of the front edge and the straight bottom at the bottom of the far edge. Trace rocks with
   `tools/art/trace-hulls.py`, and record each round sprite's near face in `render.obstacles`.
4. **Lay out the trail.** Change `keys`, `zones`, pits, runs, gardens, props and seeds so the map has its own character.
   Keep one hole per pit. Set `surfaces` for the season: traction and sink are what make ice feel unlike mud.
5. **Keep the recipe.** Thick road, rolling bumps, breakables on the firm surfaces, huge obstacles, a simple living
   panorama. Start from the swamp's numbers and tune from there.
6. **Check it.** Run `npm run build` with `HAUL_SEASON=<id>` and look at it on phone and desktop. Then run
   `HAUL_SEASON=<id> npm run test:route` for a scout and the longest truck, adjust the trail until both clear it, and set
   `status: "playable"`. Some tests in `tests/` use swamp positions, so expect to adapt them for a season they cover.

## Superpower pickups

`trail.powerups` is a list of `{ "x", "kind" }`, with `kind` one of `engine`, `suspension`, `speed` or `grip`. Place one roughly every 180 m, by purpose: Engine just before a steep climb, Suspension just before an obstacle run, Speed at the start of a long open stretch, Grip about 12 m before a deep bog. Keep them out of station bays.
