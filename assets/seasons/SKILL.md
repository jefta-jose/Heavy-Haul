---
name: season-landscapes
description: Generate and position layered season landscapes for Heavy Haul, including painted scenery, terrain textures, slope coverage, seamless repeats and gameplay validation.
---

# Season landscape setup

Use this guide when creating a season or fixing its landscape. Read the season's README first and use `swamp-summer` as the working reference. Paths below are relative to the repository root unless stated otherwise. Follow the current task's permissions: an art-only assignment does not authorize code, physics or configuration changes.

## 1. Establish the art direction

Match `assets/references/four-scout-trucks.png` and the approved artwork in `assets/seasons/swamp-summer/source/`:

- Premium semi-realistic painted game illustration, readable dark contours, weathered materials and fine natural texture.
- Soft, coherent lighting across every layer. Change vegetation, weather, moisture and palette for the season while keeping the same illustration style.
- Side view with restrained elevation for banks, logs, rocks and vegetation. Top-down orthographic view for repeatable ground materials.
- Keep distant scenery softer and lower contrast; reserve sharper texture for the road and foreground.
- No vehicles, characters, UI, writing, logos or watermarks baked into landscape layers.

Generate layers separately with the built-in image generation tool. Inspect references before using them. Save each selected output into the season's `source/` folder. Never overwrite a master: use `-v2`, `-v3`, etc. Record exact prompts, reference images, edit targets, rejected versions and rejection reasons in `source/prompts.json`.

## 2. Generate the image set

These are recommended generation targets, not assumptions about tool output. Check actual PNG dimensions and alpha after generation. Aim for at least 1500 pixels on the long side for new art. Existing approved swamp textures include smaller files; that is not a reason to reduce new masters.

| Role and filename | Recommended target | Background and composition |
| --- | --- | --- |
| `backdrop-v1.png` | 3072×1536, wide 2:1 | Opaque panorama: sky, distant terrain and vegetation. No foreground road. Quiet horizontal edges that can repeat. |
| `midground-v1.png` | 3072×1536, wide 2:1 | Transparent tree or vegetation strip. Roots share one horizontal baseline near 90% of image height. Leave headroom; include clean alpha between trunks and foliage. |
| `bank-v1.png` | 2048×1024, wide 2:1 | Side-view terrain strip with a slightly elevated view. Transparent above an irregular far crest; continuously opaque below it, including the entire bottom edge. Broad readable driving band. |
| `ground-v1.png` | 1536×1536 or 2048×2048 | Opaque top-down seamless base soil, leaf litter, snow or gravel. No horizon, perspective, road edges or large distinctive landmarks. |
| Lane material tiles | 1536×1536 or 2048×2048 | Opaque top-down seamless materials for the season's surfaces: mud, rock, packed snow, ice, etc. No baked-in track boundary or directional lighting. |
| `reeds-v1.png` or named vegetation | 1536×1536 | Transparent isolated vegetation cluster, grounded on a measurable baseline. All gaps transparent. Use the role names the renderer expects. |
| `log-v1.png` | 2048×1024 | Transparent isolated low horizontal log, detailed bark and end grain, restrained elevated side view. |
| `rock-v1.png` | 2048×1024 | Transparent isolated broad low rock with readable silhouette. Match collision geometry during integration. |
| `deep-mud-v1.png` | 2048×1024 or 1536×1536 | Opaque top-down wet slurry material: darker, glossier and softer than ordinary mud. No fixed road boundaries or vehicles. |
| `log-end-v1.png` | 1536×1536 | One circular end-grain face with bark rim, true alpha and clear margins. Used on each physical trunk in a pile. |
| `bridge-wood-v1.png` | 2048×1024 or 1536×1536 | Opaque worn timber material, horizontal grain and compatible repeat edges. No whole bridge, ropes or background. |

Ask for matching opposite edges on material tiles. Bank strips need compatible horizontal ends; ground and lane tiles need both horizontal and vertical compatibility. A seamless prompt is not proof of a seamless result: inspect tiled copies.

For transparent assets, reject checkerboards, colored fringe, opaque gaps, glow, matte backgrounds and ground shadows. Inspect against both light and dark backgrounds. Transparent corners alone do not prove the asset is clean.

### Prompt templates

Replace the bracketed details with the season brief. Include the shared style above in each generation prompt.

**Backdrop:** “Wide opaque panorama of [biome and season], distant [landforms and vegetation], [weather and lighting], layered atmospheric depth, quiet repeat-compatible horizontal edges. No foreground road, vehicles, people, UI or text. Premium semi-realistic painted game illustration matching the approved Swamp Scout references.”

**Midground:** “Transparent horizontal strip of [season vegetation], side view, rooted on one horizontal baseline around 90% of canvas height. Natural irregular canopy and spacing. Clean true alpha between every trunk and leaf, no ground slab, sky, halo, shadow or text. Match the backdrop's lighting and painted style.”

**Bank:** “Wide side-view [season ground] strip with restrained elevation showing its surface. Transparent above a low irregular far crest, fully opaque below the crest through the bottom edge. Broad drivable band around 56% of canvas height; subdued wheel ruts, varied natural shoulders, restrained stones and vegetation outside the driving band. Horizontal repeat-compatible ends. No sky, distant trees, soil cross-section, vehicle, text or drop shadow.”

**Material tile:** “Top-down orthographic seamless [material] texture, uniform physical scale and soft even lighting. Fine natural variation, no perspective, horizon, large landmarks, fixed road borders, cast shadows or text. Both opposite edge pairs must connect.”

**Prop:** “One isolated [rock/log/vegetation cluster] in elevated side view, matching the season's materials and lighting. Whole object visible with clear margins, true transparent background and internal gaps. No ground, cast shadow, colored halo or text.”

**Deep mud:** “Top-down orthographic seamless deep saturated swamp slurry, dark wet earth, soft muddy ridges, fine grit and broken murky reflections. Visibly wetter and softer than ordinary damp gravel. Uniform material scale, soft even light and matching painted palette. Opaque material, no horizon, fixed road edges, vehicles, large vegetation, text or cast shadows.”

**Log end:** “One large circular weathered log end, face-on, readable golden growth rings, irregular broken bark rim and restrained moss, matching the approved painted style. Centred with clear margins, true transparent background, no ground, trunk pile, shadow, text or halo. Preserve a circular silhouette for circular collision geometry.”

**Bridge timber:** “Orthographic seamless weathered gray-brown timber material, horizontal grain, worn surface and restrained checking, evenly lit in the approved painted style. Opaque material, compatible opposite edges, no complete bridge, ropes, board-end hardware, gaps, scenery, text or cast shadow.”

The built-in tool may return dimensions different from the prompt target. Check the actual file rather than assuming a requested size was honored. The selected swamp interactive masters are 1774×887; `log-end-v1.png` was retained and rejected for a short long side, and `log-end-v2.png` is selected. A wide canvas can hold a round log with transparent side margins: measure its alpha bounds before mapping it to a circle. Do not stretch the entire wide canvas into the obstacle.

## 3. Measure before placing

Record actual image width and height, meaningful alpha bounds, vegetation root row, prop baseline, and the bank's tire-contact row. Do not confuse canvas margins with visible content.

For the bank:

```text
scale = bankTile / imageWidth                 # metres per source pixel
worldY = terrainHeight + (contactRow - imageRow) * scale
depthBelowContact = (imageHeight - contactRow) * scale
```

The approved swamp bank is 1774×887, `bankTile = 14 m`, `bankContactRow = 500`. Its bottom reaches only about 3.05 m below contact. A 2048×1024 replacement with similar composition might put contact near row 577, but measure the generated image rather than copying that number.

Set physical texture scale deliberately. For a tile of width `W` intended to cover `L` metres, horizontal pattern scale is `L / W`. Compress the vertical scale for a receding surface. Reusing the same numeric transform with a larger image changes its world repeat size.

## 4. Position the layers

Use the current renderer as the source of truth:

- `src/render/layers/background.js`: panorama, forest-floor transition and midground.
- `src/render/layers/ground.js`: continuous ground fill, shaped bank, lane and foreground lip.
- `src/render/layers/props.js`: vegetation, rocks and logs.
- `src/render/sprite-cache.js`: resampled assets, material patterns and caching.
- `src/game/view.js`: camera scale and framing.
- `assets/seasons/<season-id>/season.json`: art map, trail, surfaces and render settings.

Draw in this order:

1. Opaque panorama and atmospheric haze.
2. Continuous distant ground apron, then transparent midground vegetation over it.
3. Opaque terrain fill extending past the screen bottom, then the painted bank and lane.
4. Wet mud surface and retained tracks, back props and physical bridge decks.
5. Vehicle shadows, vehicles and effects that belong behind them.
6. Irregular foreground soil lip, near log faces, mud below the terrain contour, near bridge ropes, water and foreground props.
7. Gentle foreground shade and HUD.

Keep backgrounds in screen space with parallax. Keep the road, props and obstacles in world space. Camera movement must not slide the road under the tires. Use `visH(x)` for visible ground and the intended collision height for tire sinking; do not create a separate hand-drawn hill profile.

### Background and root alignment

Current swamp reference placements are:

| Layer | Display height | Display bottom | Horizontal parallax |
| --- | --- | --- | --- |
| Backdrop | `1.04 × viewportHeight` | `1.02 × viewportHeight` | 0.055 |
| Midground | `0.55 × viewportHeight` | `0.73 × viewportHeight` | 0.24 |

Preserve aspect ratio. These are starting points for the swamp composition, not universal coordinates for every season.

Measure the **visible root baseline**, including transparent padding:

```text
rootScreenY = imageBottomOnScreen
            - displayedImageHeight * (1 - rootRow / sourceHeight)
```

With roots at 90% of the source height, the swamp placement gives `0.675 × viewportHeight`, not 0.73. Start the distant ground behind those roots and feather its upper boundary. The current swamp starts that transition around 0.65 of viewport height. Compress the ground texture in depth so it reads as a receding surface rather than an earthen wall.

Check this connection in portrait as well as landscape. Do not expose the panorama's lake, sky or empty lower padding as a disconnected gap behind a descending road. Actual water belongs in the season's authored water areas; retain intentional distant water where it fits the composition.

### Ground coverage on slopes

Before drawing the bank, fill a polygon following the **entire visible terrain contour** down beyond the viewport bottom. Extend horizontally beyond both screen edges. The world-space bottom of the viewport is:

```text
bottomY = cameraY - viewportHeight / (2 * pixelsPerMetre)
```

Give the fill extra coverage below that value. Never fill only below one height sampled at the camera centre: uphill and downhill sections will reveal wedges. Never rely on a finite bank bitmap to cover every viewport height.

The contact band must follow the exact terrain. Away from it, blend small bumps into broader landforms. The current bank renderer uses a weighted average over ±3 m and reduces detailed deformation with distance from contact. Shearing the entire image equally at every 0.25 m terrain sample makes all the mud, puddles and foliage bend into accordion folds.

Mirror neighboring bank tiles when their generated ends do not match. Align tile boundaries to the terrain sampling grid and overlap raster edges slightly to avoid hairline cracks. Mirroring cannot hide a large unique stump or boulder repeated at every join; revise that art if repetition remains obvious.

### Road, water and props

- Blend a broad worn lane into the bank with soft irregular shoulders and material transitions. Avoid a solid black ribbon or a bright continuous border.
- Use subtle paired ruts with natural width variation. Preserve the painted texture instead of covering it with opaque flat color.
- Keep puddle glints in low, nearly level areas. Do not place horizontal standing-water reflections on steep faces.
- Choose lane materials from surface data. Adding snow, asphalt or ice requires matching surface definitions and material mappings; artwork alone does not change traction.
- Place vegetation outside the wheel path and align its visible base to the surface at that depth. Rocks and logs shown as obstacles must agree with their actual collision bodies.
- Restore soil over sunk tire bottoms with an irregular contour near contact. Do not use a straight rectangular mask that cuts the tire off.

### Interactive road features

Use the existing Planck physics and Canvas renderer when gameplay integration is authorized. CSS can communicate surface and service state in the HUD; physics bodies and world-space drawing provide the road behavior. Adding a library is optional.

**Deep bogs:** use `terrain.mudAt(x)` as the shared field for visible wetness and effects. Collision-bed depth comes from the same zone/envelope calculation. In the current swamp, ordinary mud has `sink = 0.26 m`; `heavySink = 0.16 m` adds depth near the four `trail.heavyMud` centres with a smooth 10 m half-width. The deep material must read as dark glossy slurry before the truck slows. Keep ordinary mud lighter and less saturated. Draw low-contrast reflections and bubbles on nearly level portions, brown muddy droplets for slurry and pale spray for actual water.

Use continuous material polygons with feathered boundaries. Overlapping translucent columns create vertical seams; a broad opaque black strip hides the painted road. After vehicles, redraw mud only below the irregular terrain contour to bury tire bottoms. Retain bounded world-space tire impressions while moving; clear them when the simulation world changes. These impressions are visual. The deeper collision bed supplies actual sinking; this is not persistent deformable terrain.

Implementation: `src/render/layers/mud.js`, `src/render/particles.js`, `src/physics/terrain.js`. Selected art keys are `deepMud`, `logEnd` and `bridgeWood` in `season.json → art`; their masters and runtime files are listed in `swamp-summer/README.md`.

**Four-log piles:** author `trail.logPiles` as `{x, radius}`. Current swamp piles are at 64 m, 775 m and 1652 m with radii 0.36 m, 0.40 m and 0.42 m. Build three lower collision circles and one raised trunk, partly burying the bottom row. The current spacing is `1.9 × radius`, with the upper centre raised by `1.58 × radius` and its radius scaled to 0.9. Keep scattered props out of the reserved approach. Render the measured log-end alpha bounds at each circle, with bark extending behind it in the restrained elevated view. Four logs in one decorative bitmap do not supply four physical obstacles.

Keep the launch area clear; placing the first pile inside the baseline acceleration run invalidated that check. Verify a Scout can climb with an appropriate approach and that the weaker Mesa visibly struggles. Do not flatten the pile solely to make every truck cross at idle. Implementation: `src/physics/obstacles.js`, `src/render/layers/props.js`.

**Timber bridges:** author `trail.bridges` with `id`, `x0`, `x1`, `sag` and `depth` (`capacityT` is no longer used). Current swamp spans are 364–378 m and 957–969 m. Excavate the ground below the span, so the bridge reads as a crossing over a gully. Spawn against `terrain.driveH(x)` so checkpoint or service spawns do not start beneath the deck.

Bridges are rigid, as in SnowRunner: roughly 0.7 m static boards laid along the deck line (with its sag), drawn at each board's position and angle. They never swing, flex or break (hinged, breakable boards were dropped on 2026-10-31: SnowRunner bridges do not swing, and they cost physics time on phones). A `missingBoard` is a sensor gap a tire falls through. Implementation: `src/physics/bridges.js`, `src/render/layers/bridges.js`.

## 5. Integrate and cache

When integration is authorized, map selected masters in `season.json`, using paths relative to that season:

```json
"bank": { "file": "art/bank.webp", "source": "source/bank-v2.png" }
```

Update `render.bankContactRow` when the selected bank changes. Keep every trail zone's surface present in `surfaces`, and every lane material key present in `art`. Keep the role names expected by the renderer unless extending it is part of the task.

Encode runtime WebP assets without changing master dimensions or composition. Trace or update rock hulls when rock art changes. Preserve versioned PNG masters and prompt history.

Resample scenery once per zoom/DPR change. Cache shaped bank sections and reuse them for the main ground and foreground lip. The current renderer uses half-bank-width chunks with a 20-chunk limit. Invalidate relevant caches when scale, artwork, registration or terrain changes. Keep memory bounded over long drives; avoid per-frame full-resolution image warps or filters.

Cache static wet material separately in 7 m chunks with a 20-chunk limit. Reuse rasterized tire-impression stamps by wheel radius, sink bucket and pixel scale instead of drawing every ellipse and rim path twice each frame. The current mud layer keeps at most 260 impressions for 35 seconds. Rebuild scale-dependent caches on zoom/DPR changes and reset run-local marks on restart.

## 6. Check the actual game

Run applicable commands from the repository root, within the task's authorization:

```sh
npm run art:encode
npm run build
npm run test:browser
npm run check
```

For another season, select it with `HAUL_SEASON=<season-id>`. The full check includes vehicle, route and browser tests. Current browser tests include opaque ground coverage below uphill, downhill and valley contours. A passing build alone does not establish correct placement.

Inspect gameplay captures at:

- Flat start, steep ascent, crest, descent, valley, deep mud and water crossing.
- Every material boundary and several horizontal tile joins while scrolling.
- Desktop 1600×900, phone landscape 844×390 and portrait 390×844.
- Normal and close camera, resizing, checkpoint teleports and a long drive.
- All four zoom levels (1.5, 2.5, 3.5, 4.5), bog entry at speed, stationary sinking, four-log climbing and a loaded bridge crossing.

Accept only after confirming:

- No transparent wedges, exposed bitmap bottoms, disconnected ground or abrupt soil walls.
- Tree roots sit naturally in the distant ground and vegetation gaps have clean alpha.
- Road texture remains anchored; small bumps do not warp the entire landscape.
- Tire contact, mud sinking, obstacles and foreground occlusion agree with physics.
- Deep bogs are visibly different before slowdown; splashes match mud or water, and bridges are rigid and crossable.
- Repeats and surface transitions do not form conspicuous seams or mirrored landmarks.
- Palette, light and material scale agree across layers; snow or water does not resemble a pasted-on overlay.
- Scrolling is smooth after caches warm, memory stays bounded, and startup has no black flashes.

`tests/terrain.test.js` covers greater bog immersion, four physical logs per pile and a rigid Scout bridge crossing. Browser tests check bog labels, retained tracks, bridge surface state and clearing tracks on restart, alongside the existing service and viewport checks. Review `output/captures/08-bog-splash.png`, `09-swing-bridge.png` and the `terrain-` captures when available; a screenshot cannot prove motion or collision behavior.

Profile using normal animation-frame pacing as well as CPU drawing time. Forcing dozens of complete renders inside one callback can stall while Canvas drains queued raster work and is not a meaningful FPS measurement. Compare the same viewport, zoom, renderer and device before and after the feature. Headless software rendering does not establish real-device frame rate.

When a check fails, fix its cause: coverage and registration in rendering, collision alignment in integration, or defective silhouettes and baked-in seams in image generation. Save revisions beside old masters. Report the selected files, measurements, checks actually run, captures and any remaining visible limitation; do not promise that a prompt or a checklist guarantees an issue-free landscape.
