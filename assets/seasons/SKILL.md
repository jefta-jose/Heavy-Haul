---
name: season-landscapes
description: Build a new Heavy Haul season by studying Blackwater Swamp and generating the same set of art for a new biome: a living panorama, thick road strips, road materials, obstacles and breakables, plus how to check them in the game.
---

# Building a season

**Blackwater Swamp is the reference.** Read [`swamp-summer/README.md`](swamp-summer/README.md) first: it explains what
makes the season work, every setting and the step-by-step recipe. Then read `swamp-summer/season.json`. This guide
covers the art for a new season and how to check it. Follow the current task's permissions: an art-only assignment
does not authorize code, physics or configuration changes.

## Art direction

**Hard rule: a simple, life-giving background behind a thick, detailed road.**

- **Background:** flat shapes, soft gradients and little fine texture, but full of the season's life: its light, sky,
  big characterful trees or landforms, hazy layers, and a touch of water or ground. Simple does not mean empty or grey.
- **Road:** full detail. Weathered, muddy, semi-realistic painted materials with readable shapes.
- **Everywhere:** soft coherent light, the same illustration style across layers, and no vehicles, characters, UI,
  writing, logos or watermarks.

Compare new art with the masters in `swamp-summer/source/`.

## The image set

Generate each image separately and save it to the season's `source/`. Never overwrite a master: use `-v2`, `-v3` and so
on. Check the real dimensions and transparency afterwards, because image tools often return a different size than asked.
Aim for at least 1500 pixels on the long side.

| Role | `art` key | Shape | Background |
|---|---|---|---|
| Panorama | `backdrop` | Wide, about 3:1 | Opaque |
| Road front edge | `roadEdge` | Very wide strip | Transparent |
| Road far edge | `roadFar` | Very wide strip | Transparent |
| Earth | `roadSoil` | Wide | Opaque |
| Road surfaces | `ground`, `wetmud`, `granite` or the season's own | Square tile | Opaque, top-down |
| Deep bog | `deepMud` | Square or 2:1 tile | Opaque, top-down |
| Mud hole | `mudHole` | 2:1 | Transparent |
| Fuel station | `fuelStation` | 3:2 | Transparent |
| Roadside plant | `reeds` | Square | Transparent |
| Rock | `rock` | 2:1 | Transparent |
| Round obstacles | `logCrossing`, `corduroyLog`, `rottenLog`, `pipe`, `oilDrum` | 2:1 | Transparent |
| Traced props | `rootTangle`, `concreteSlab`, `branchPile` | 2:1 | Transparent |

Reject transparent art with a checkerboard, coloured fringe, glow or ground shadow, and look at it on both a light and
a dark background. A seamless prompt does not prove a seamless tile, so inspect tiled copies. Strips and the panorama
are mirrored in code, so their ends need not match exactly.

## Prompts

Fill in the brackets for the season.

**Panorama**
```
Create a wide 3:1 opaque painted game background, side view, no text, no logos, no vehicles, no people, no road.

Scene: a [season and biome] full of life. [Light, such as a warm low sun with soft rays] in a [sky, such as blue with a few soft clouds]. Big characterful [trees or landforms] in the foreground on both sides, then two or three layers of hazier ones fading into the distance. [Calm water, snowfield or meadow] with small details such as [reeds and lily pads] along a horizontal line about two thirds of the way down.

Below that line, the bottom third of the image is one flat calm band of a single soft colour with no detail, because a road will cover it.

Style: clean, simple painted game illustration with flat shapes, soft gradients and little fine texture. Bright and full of life, not grey or foggy.
```

**Road front edge**
```
Create a very wide side-view game terrain strip on a truly transparent background (real alpha, no checkerboard, no shadow outside the shape), in a 3:1 ratio or the widest you can make.

Subject: the front edge of a thick [season] road, seen straight on from the side. A continuous horizontal band of [packed material] with [moss, grass, roots or the season's equivalent] and small stones along it. The top edge is fairly straight and even, as if it continues back into a flat road. The bottom edge is irregular, with clumps of [material] hanging down in small drips.

The band runs across the whole width with no gaps and touches the left and right canvas edges at the same height. The top and bottom of the canvas stay transparent. Evenly detailed, with no single big feature, no focal point and no vehicles, tracks, puddles, trees or rocks larger than a fist.

Style: rich, hand-painted, gritty game art with a muted [season] palette and soft, even lighting. No text.
```

**Road far edge**
```
Create a very wide side-view game terrain strip on a truly transparent background (real alpha, no checkerboard), in a 3:1 ratio or the widest you can make.

Subject: the far edge of a [season] road. A low, irregular line of [grass, reeds, ferns or the season's plants] along the top, sitting on a thin band of dark [ground] at the bottom. The bottom of the band is straight and fully opaque so it can tuck behind a road. Everything above the plants is transparent.

Simple and soft, slightly hazy and low contrast because it sits behind the action. Evenly spaced, with no large plants, trees, vehicles, water or focal point. The left and right edges should touch the canvas at the same height.

Style: hand-painted game art with a muted [season] palette and soft, even lighting. No text.
```

**Earth**
```
Create a wide opaque game texture, flat straight-on side view, of a cut-away cross-section of dark [season] earth, as if you were looking at the side of a trench.

Subject: dark [soil, frozen ground or the season's earth] in near-black tones, with subtle horizontal layering, a few thin roots and scattered small stones half buried. Low contrast and calm, because game buttons and dials will sit on top of it. It gets slightly darker toward the bottom.

Evenly detailed across the whole image, with no big features, no focal point, no horizon, no sky, no grass, no water and no perspective. Left and right edges should match in brightness and pattern.

Style: rich, hand-painted, gritty game art, simple and understated. No text.
```

**Road surface or deep bog tile**
```
Top-down orthographic seamless [material] texture, uniform scale and soft even lighting. Fine natural variation, no perspective, horizon, large landmarks, road borders, cast shadows or text. Both pairs of opposite edges must connect. For deep bog: visibly darker, wetter and softer than the normal surface, matte, with no sky reflections or bright glints.
```

**Fuel station**
```
Create a single game prop on a truly transparent background (real alpha, no checkerboard, no ground, no shadow outside the shape): a small roadside fuel and repair stop for trucks in a [season and biome], seen in a flat straight-on side view with no perspective.

Subject: a simple open canopy on two posts over one old fuel pump, with a small workshop shed to one side, a stack of tires, oil drums and a tool rack. Built from [local materials], weathered and lived in, with [season's plants or snow] growing around its base. A bright, cheerful [accent colour] canopy makes it easy to spot from far away.

All of it stands on one straight, level base line at the bottom of the object, so it can sit on a road edge. The space under the canopy stays open so a truck can be seen through it. No vehicles, no people, no text, no logos, no numbers, no ground slab.

Style: clean painted game illustration, bright and full of life, with readable shapes and soft, even light. It should match the [season]'s background.
```

**Rock, obstacle, mud hole or plant**
```
One isolated [object] in side view with slight elevation, matching the season's materials and lighting. The whole object is visible with clear margins, on a true transparent background including any gaps inside it. No ground, cast shadow, coloured halo or text. Round obstacles lie across the road with their near circular face toward the viewer, and their body receding behind it.
```

## Fit it to the game

`swamp-summer/README.md` has the settings and recipe. Things that are easy to get wrong:

- **`render.backdropHorizon`:** measure the panorama's waterline as a share of its height. Do not copy the swamp's value.
- **Strip crops:** set `crop` in the `art` entry to the visible rows. The front edge's top row is the road's edge, and
  the far edge's bottom row sits behind the road.
- **Obstacles:** rocks need hulls traced from the art (`tools/art/trace-hulls.py`), and round sprites need their near
  face in `render.obstacles`. What is drawn has to match what the tires hit.
- **Surfaces:** art alone does not change traction, so set `surfaces` in `season.json`.

Backgrounds are in screen space, while the road and obstacles are in world space. Only `src/render/layers/ground.js`,
`background.js`, `mud.js`, `props.js` and `src/render/sprite-cache.js` should need reading, and a new season should not
need changes to them. If it does, keep the change generic.

## Check it in the actual game

```sh
HAUL_SEASON=<id> npm run art:encode
HAUL_SEASON=<id> npm run build
HAUL_SEASON=<id> npm run test:route
npm run test:browser
```

Look at the game on desktop (about 1440×900), a sideways phone (844×390) and an upright phone (390×844), on flat road,
climbs, crests, descents, bogs and every surface change. Check with a small truck and the longest one.

Accept it only when:

- The panorama's waterline sits behind the road with no gap, even on descents, and the colours look alive.
- The road's edges follow every hump, with no cracks, wedges or obvious repeats, and the earth reaches the screen bottom.
- Rolling bumps are felt on open stretches, and obstacles sit on the road and match their collision.
- Deep bogs read before they slow you, and each has its mud hole. No mud hole appears anywhere else.
- Breakables break, a scout and the longest truck clear the trail, and service trucks cross every pit.
- It scrolls smoothly on a real phone, since headless tests can't measure that.

Report what you checked and anything that still looks off. A screenshot cannot prove motion or collision.
