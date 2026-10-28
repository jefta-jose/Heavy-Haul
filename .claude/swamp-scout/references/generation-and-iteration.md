# Generation and the visual review loop

Use this reference when generating or replacing artwork. Resolve project links relative to this file;
`../../..` is the repository root. The complete historical prompts are in
the car's and season's `source/prompts.json`
([car](../../../assets/cars/swamp-scout-4/source/prompts.json), [season](../../../assets/seasons/swamp-summer/source/prompts.json)).

## The sequence that produced the approved scout

1. Generate one assembled transparent Swamp Scout from the original four-vehicle reference. Identify
   only the bottom-right panel as the input role. Match the olive expedition body, orange recovery
   boards, tan side boards, gray cases, rear spare, snorkel, bumpers and enormous dark mud tires.
2. Inspect that master. It should already have the desired illustration quality: readable scratches,
   weathered surfaces, tiny fittings, glass, rim recesses, tread thickness and dark natural contours.
3. Edit the master to remove all four **road** tires, including glimpses of far-side tires. Retain the
   rear spare, chassis and suspension details. Preserve the canvas, body position, camera and scale.
   This preserves the design relationship between the body and the generated master.
4. Generate one matching wheel on a square transparent canvas, with a circular silhouette, centered
   hub and even lighting. Near and far instances share this asset. Do not use an entire vehicle image
   as a rotating wheel, and do not assume the canvas center is the actual hub center.
5. Independently generate the panorama, tree strip, bank, soil and props with the same reference style.
   Independent assets can be generated concurrently when the tool supports it. Body edits depend on
   the assembled master and should use that actual image.
6. Integrate the images and review actual game captures at rest, in motion, on uneven ground and after
   camera/viewport changes. Targeted image edits and renderer corrections then address observed gaps.

### Asset roles and current selections

| Role | Current source | Background / special requirement |
| --- | --- | --- |
| Complete design / intro | `vehicle-master-v1.png` | Transparent, including road tires and attached gear |
| Moving body | `body-v1.png` | Transparent empty road-wheel arches; spare remains |
| Rotating tire | `wheel-v2.png` | Transparent square, circular, centered hub, soft even light |
| Distant swamp | `backdrop-v2.png` | Opaque panorama, misty cool distance, no vehicle or UI |
| Midground | `midground-v1.png` | Alpha between trunks/foliage, rooted horizontal baseline |
| Driving bank | `bank-v2.png` | Slightly elevated side view, transparent above far crest, opaque lower ground, matte (no sky reflections) |
| Extended ground | `ground-v1.png` | Top-down repeatable base color, no perspective or fixed lane |
| Reeds | `reeds-v3.png` | Clean alpha in every gap, no glow |
| Fallen timber | `log-v1.png` | Transparent single low prop cluster |
| Collision rock | `rock-v2.png` | Transparent broad low rock, painted moss and crevices |

Vehicle masters are in `assets/cars/swamp-scout-4/source/`, environment masters in
`assets/seasons/swamp-summer/source/`. The `art` map in each `car.json` / `season.json` selects the
runtime WebP. Rejected variants are kept beside the selected ones (never overwritten), with their
reasons in `prompts.json`.

## Reusable prompt shapes

Adapt the vehicle, biome and reference roles to the actual request. Use the historical JSON for exact
wording used in this run rather than reconstructing its details from memory.

**Assembled master**

> Reference role: design, camera and illustration style. Use only the specified vehicle/panel.
> Generate one complete vehicle facing right, mostly side-on with a restrained elevated view showing
> some hood, roof, body width and tread. Match the reference's detailed semi-realistic painted game art,
> natural dark contours, weathered paint, material richness and equipment. Keep the full vehicle in frame
> with clear margins. True transparent background. No scene, ground shadow, UI, writing or watermark.

**Body extraction/edit**

> Edit target: the inspected assembled master. Remove all road wheels and tires, including any visible
> far-side tires, leaving true transparent empty wheel regions. Keep the attached spare, body, rack,
> recovery equipment and chassis. Preserve the canvas dimensions, position, camera, scale and detail.
> Do not redesign or move the body. This is the moving body layer; road wheels are animated separately.

**Wheel**

> Reference role: the road tires on the inspected master. Generate one matching off-road tire and rim,
> exactly circular and centered on a square transparent canvas, with equal clear margins. Match tread,
> rim, hub, bolts, grime and illustration finish. Use soft even ambient light suitable for rotating the
> entire sprite. No body, axle, ground, cast shadow, lettering or background.

**Bank strip**

> Reference role: the selected scene's terrain, viewpoint and palette. Generate a wide horizontal wet
> ground strip with a slight elevated side view. Transparent above an irregular low far crest; opaque,
> richly textured near ground reaches the lower edge. A broad drivable middle lane, mud clods, shallow
> puddles, small stones and roots. No sky, distant trees, vehicle, soil cutaway or UI. Request connecting
> horizontal ends, then verify the joins in the actual renderer.

For transparent vegetation, specify clean alpha around the silhouette and between every leaf. When an
edit preserves a bad halo, a new generation from the original style reference can be more effective
than editing that same defective cutout repeatedly.

## Observed refinements

- **Reeds v1/v2:** colored background glow remained around the plant despite transparent corners.
  Both were rejected. A fresh v3 from the original reference produced the clean isolated silhouette.
- **Wheel v1:** excessive tan coating on lug faces weakened the dark-rubber look. Edit v2 preserved
  the silhouette and hub, reduced coating and restored dark charcoal tread with gray edge definition.
- **Backdrop v1:** bright saturated sky was too sunny for the reference. Edit v2 preserved composition
  and added cooler humid distance, a pale overcast sky and restrained nearer warmth.
- **First playable assembly:** a straight crop through the mud made tire bottoms look cut off.
  The fix was an irregular terrain clip in the renderer, not a new body image.
- **Scrolled/zoomed view:** the bank had hard repeat joins despite a tileable prompt. Mirrored,
  tile-aligned repetition removed the visible joins.
- **Camera/phone review:** zoom framing and control overlap required camera/UI fixes. Regenerating
  an already good vehicle would not have addressed either issue.

Inspect real composites, not just standalone thumbnails. Judge silhouette, wheel registration, grounded
contact, matching light and palette, alpha edges, perspective and readability at the intended scale.
Choose the next action from the visible defect. Stop revising a satisfactory asset when the remaining
problem is its integration; resume image generation when an actual image mismatch remains.

Save versioned originals and record accepted/rejected selections in `prompts.json` and the `art` map.

**Split layers:** a load split into separate parts (the 2026-10-26 trailers and loads) came back in
mismatched angles and scales and was dropped. Only animated load layers made as edits of the approved
body, on its exact canvas and camera, are allowed (AGENTS.md); composite them over the body to check.
Lesson (2026-10-28, Ice Breaker orca): for animated parts of an existing picture, cutting them out of the approved art is reliable; asking the generator for them is not (it redraws the whole picture and loses pixel registration). Codex is still the right choice for whole new pictures. How it was done: the orca's outline is the
difference between the approved body and an empty-tank image aligned to it; its pixels come from the
approved body, and the gap behind it is refilled from the aligned empty tank. The stack must rebuild
the approved body (mean error 0.04 here, zero outside the tank).
Do not adopt the historical fourteen-image count as a minimum, maximum or spending authorization.
