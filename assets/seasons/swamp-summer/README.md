# Blackwater Swamp landscape

Use the [season landscape guide](../SKILL.md), [approved Swamp Scout style](../../references/four-scout-trucks.png) and [obstacle design reference](../Off-Road%20Terrain%20Obstacles%20Guide.png). Preserve the swamp background, soft painted finish and muted natural palette. Road mud and hole interiors are matte brown with **no sky reflections or bright wet glints**.

## Selected road art

| Role | Master | Runtime |
| --- | --- | --- |
| Road bank | `source/bank-v2.png` | `art/bank.webp` |
| Matte bog material | `source/deep-mud-v2.png` | `art/deepMud.webp` |
| Climbable rock | `source/rock-v2.png` | `art/rock.webp` |
| Complete crossing log | `source/log-crossing-v1.png` | `art/log-crossing.webp` |
| Bridge sleeper fascia | `source/bridge-plank-v2.png` | `art/bridge-plank.webp` |
| Timber bridge supports | `source/bridge-frame-v1.png` | `art/bridge-frame.webp` |
| Steel bridge supports | `source/bridge-steel-frame-v1.png` | `art/bridge-steel-frame.webp` |
| Hole rim and basin | `source/mud-hole-v1.png` | `art/mud-hole.webp` |
| Concrete culvert | `source/pipe-v1.png` | `art/pipe.webp` |
| Bridge deck material | `source/bridge-wood-v1.png` | `art/bridgeWood.webp` |

The seven replacement obstacle masters are 1774×887 PNG with true alpha, encoded to same-size WebP by `npm run art:encode` (registration coordinates stay in source pixels). The first `bridge-plank-v1.png` is retained but rejected because its 1254×1254 canvas was below the 1500px minimum. `source/prompts.json` records exact built-in imagegen prompts, references, dimensions, alpha bounds and selected/rejected status. Old masters remain beside their replacements.

## Playable route

The seeded route currently contains **110 collidable rocks**, including **75 garden rocks** in ten repeated rock sections, **44 crossing logs** and **30 culvert pipes** in **15 ground-level runs**, **11 authored holes**, **three ramps** and **three bridges**. Mud and dirt stretches between obstacles provide recovery space. Launch, fuel and depot approaches stay clear.

- `trail.rockGardens`: repeated low crests with occasional taller boulders, sized so the wheels articulate rather than meeting an impassable wall. `rock-hulls.json` traces the selected rock's alpha silhouette into an eight-vertex convex hull. Drawing uses the same width, body origin, flip and burial as collision.
- `trail.holes`: 6–9 m wide bowls, 0.6–1.0 m deep, with climbable entry/exit slopes. The hole depresses the shared visual and collision height fields. Its painted matte basin and rims are registered over that depression. The last hole is an eroded road washout.
- `trail.obstacleRuns`: nine log runs and six pipe runs. Every climbable crossing contains 4, 5 or 6 circles in a single ground-level line; isolated procedural logs and vertical stacks are removed. Each object's center follows its own local collision bed with the same shallow burial. `gap` is clear edge-to-edge spacing; `gaps` can vary it within a run. Tight spacing (as low as 0.15 m) creates sustained rolling climbs, while gaps up to 1.6 m let the tires drop and bounce between crests. The whole run is reserved against rock placement.
- Complete log and pipe sprites register their near faces to the physical circles, with their bodies receding toward the far verge. Soil clips the buried portions. The pipe mouth is decorative, not a drive-through tunnel.
- `trail.ramps`: three authored low rock ledges with sloped approaches and returns.
- `trail.bridges`: timber crossing at 364–378 m, steel-framed crossing at 957–969 m, and damaged timber crossing at 1182–1190 m. Rigid deck boards (static, as in SnowRunner: no swing, flex or breaking since 2026-10-31) span excavated gullies. The damaged crossing has one non-supporting deck segment, with a corresponding visible opening. The steel frame uses timber sleepers on its deck.
- `trail.recoverySections`: calmer stretches between challenges; these suppress incidental terrain noise without changing macro hills.

## Registration and rendering

`render.obstacles` stores the near circular face centers/radii for logs and pipes, and the bridge sleeper's front edge in source pixels. Full object canvases retain these coordinates. Support frames, hole overlays and rocks are alpha-cropped once in the runtime cache. Timber fascia maps to each physical board; its connected top uses the wood material to avoid perspective-taper gaps when repeating sprites.

Both the bank and collision field follow the same ground profile, with finite image layers backed by opaque terrain below. Ground beneath a bridge is a real gully. Mud overlays and tire impressions stay in world space; the existing run-persistent ruts are preserved. Water remains confined to authored basins.

## Validation

`npm test`, `npm run test:route` and `npm run test:browser` pass for this rebuild. The added terrain tests check suspension travel through repeated rocks, an actual tire dropping into and climbing out of a hole, pipe collision, tire-drop and spring travel over spaced pipes, and a non-supporting broken deck segment. Existing tests cover bog immersion, ground-level runs and rigid bridge crossing. The full-route check drives every leg with recovery support for the worst bogs.

Desktop and phone captures, plus a review gallery, are under `output/road-review/`. `index.html` shows logs, rocks, holes, pipes, timber/steel/broken bridges and the washout. Inspect the real game at its normal camera scale when revising an asset; texture alone does not supply collision or motion.
