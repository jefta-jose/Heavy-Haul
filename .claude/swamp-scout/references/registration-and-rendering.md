# Registration, physics and rendering

Read when integrating a new vehicle, replacing a body/tire, or changing the scene renderer. Current
source and configuration take precedence over historical constants in this document.

## Project entrypoints

| File | Responsibility |
| --- | --- |
| [src/render/](../../../src/render) | Painted renderer: `renderer.js` (layer order), `sprite-cache.js`, `particles.js`, `layers/` |
| [src/physics/](../../../src/physics) | Planck terrain, obstacles, vehicle (with its load's mass), drivetrain, water and the service winch (`simulation.js` composes them) |
| [src/game/](../../../src/game) | Camera framing (`view.js`), input, HUD, session rules; [src/main.js](../../../src/main.js) wires it all |
| [car.json](../../../assets/cars/swamp-scout-4/car.json) | Art map, image-to-world registration (`rig`), physics and drivetrain |
| [season.json](../../../assets/seasons/swamp-summer/season.json) | Trail, surfaces, art map and render settings |
| [tools/build.js](../../../tools/build.js) | esbuild bundle with the selected car and season embedded |

## Measure the body before tuning physics

The current body is 1774 × 887 pixels. Body origin is image pixel `(900, 650)`, with 235 pixels per metre.
Image Y points down; physical world Y points up:

```text
localX = (pixelX - originX) / pixelsPerMetre
localY = (originY - pixelY) / pixelsPerMetre
```

Measured hub centers are approximately `(1403, 695)` front and `(441, 695)` rear. The active
registration stores axles front-first: `[2.1404255319, -1.9531914894]`, wheel Y `-0.1914893617` and
physical tire radius `0.872 m`, sized so the tread fills the painted wheel arches (the earlier 0.78 m
tire left a visible gap under each fender). Draw the wheel image using its own pivot `(627, 627)` and artwork radius
`561 px`, scaled by `physicalRadius / artworkRadius`. Transparent image margins are not tire radius.

Read these values from `car.json` rather than duplicating them in renderer code. Re-measure a replacement
whose silhouette or canvas changed; keeping old pivots on new art produces sliding arches and wobble.

The body image is flipped vertically into world coordinates, translated to the physics chassis position
and rotated by its angle. Each tire reads its own body's position and spin angle. The spare remains part
of the chassis image.

## Keep the simulated vehicle consistent with the picture

The game explicitly initializes `makeSim` with `profile: 'swampScout'` and the measured `scoutRig`.
The default profile without that option remains the old heavy hauler for legacy physics tests.

Current scout baseline:

- The load is part of the car: its art is in the body image and its mass is `physics.load`. A rig
  with a trailer drawn in is one body with all its axles and `drivetrain.drivenAxles`.
- Two physical axle/wheel bodies represent four visible road tires on a single travel line.
- Chassis mass 3800 kg plus two 180 kg axle/wheel bodies; approximately 4.2 t total.
- Brisk take-off, smooth drive: torque curve 0.17 x the heavy diesel with torque-converter
  multiplication (up to 2.1x at standstill, gone by 1000 wheel-side rpm), H/L/R 15/46/36, throttle
  spools at 1.8/s, and the commanded drive speed climbs fast from rest then at ~420 rpm/s once
  rolling (`npm run feel` prints the curves).
- Mud is patchy per tire (`mudPatch`) with a bog drag, and the open differential is capped by the
  weakest tire, so 4x4 and DIFF each change progress clearly in deep mud.
- Crushable rocks (`rock.crush`) break after about 900 N·s of tire impulse and emit `S.events`.
- Obstacles: climbable boulders on every firm section, fallen logs (`S.logs`, static circles; half
  sunk in mud), deep potholes (2.8-4 m wide, 0.42-0.64 m deep) and washboard. Service trucks winch
  out of the four heavy-mud pits; there are no winch posts.
- Suspension sag `0.16 m`, upward travel `0.32 m`, downward travel `0.38 m`, damping ratio `0.48`.
- Mud collision sink `0.26 m`; visible mud surface remains on `sim.visH(x)`.
- Governor 2300 rpm. The scout starts with 4×4 and DIFF off; the deep-mud start selects low range,
  4×4 and differential lock. Toggling either flashes a green (on) or red (off) outline around the vehicle.

For different vehicles, recompute mass, clearance, axle positions, spring loading and torque to fit the
new rig. Rear axle load distribution must use the actual axle count. Derive driven wheel indices from
available wheels; the old three-axle `[0,1,2]` assumption fails on this two-axle scout. Hiding a trailer
sprite is insufficient when its physical body and mass are still attached.

## Preserve layer order

The active sequence is:

1. Opaque distant panorama, subtle atmospheric haze, transparent midground trees.
2. World-space painted bank, then the per-surface road lane (ruts and far edge).
3. Back props, collision-rock art and log bark bands.
4. Exhaust smoke and haze (behind the vehicle), chassis and tire contact shadows.
5. The 4x4/DIFF outline (only while flashing), far tires, body, near tires, then the fender overlay
   (body with `archCircles` cut out).
6. Service winch cables, the foreground bank lip (only near the vehicle), then the log end caps.
7. Contact accents, faint reflection, water surface, ripples, dust, spray, drops and chunks, front props.
8. Mild bottom-screen shading, then the HUD.

Every sprite is drawn from canvases resampled once per zoom level in `prepare()`, never from the full
source images. See [feel, audio and performance](feel-audio-and-performance.md).

Far tires currently use a constant world projection offset `(0.2, 0.13)`, radius factor `0.95` and a
pre-darkened copy of the wheel (no per-frame `ctx.filter`, which was a major frame-time cost). These are
tuning values for this art and camera, not universal offsets for every vehicle.

The fender redraw is the body with the `archCircles` (body pixels `[x, y, r]` in `car.json` `rig`) cut out.
It restores the flares over the near tires while springs and liners inside the arch stay behind the
tread, and the tire tucks under the flare as the suspension compresses. A wheel should not disappear
behind an opaque body panel, draw over a door, leave a gap under the flare, or expose a fixed painted
hub when it moves. The arch-fitting procedure is in [feel, audio and performance](feel-audio-and-performance.md).

## Ground and depth

Bank tile width is `14 m`; source tire-contact row is `500` in an 887-pixel-high strip. The world scale
is `tileWidth / imageWidth`. The contact band follows `sim.visH(x)` exactly. Horizontal bands farther
from contact blend toward a weighted terrain average over +/-3 m. Do not shear the whole painting
by every tiny bump: that makes the verge and foreground look like corrugated fabric. Shaped bank
sections are cached in half-tile chunks at the current pixel scale, with a maximum of 20 chunks.

Fill beneath the complete visible terrain contour to beyond the viewport bottom before drawing the
bank. Never extend the ground using a single height sampled at the camera centre: on slopes that
leaves triangular holes or exposes the bottom of the bitmap. The browser coverage regression checks
every sampled pixel below uphill, downhill and valley contours at desktop and phone sizes.

An opaque, textured forest floor connects the bank to the tree roots, behind the midground trees.
Account for transparent image padding: although the midground image ends at 0.73 of screen height,
its visible roots end near 0.675. Feather soil behind those roots and compress its texture in depth;
otherwise a descending bank exposes the panorama's water as a disconnected gap or a hard soil wall.

The lane is a broad worn surface with blended shoulders and two subtle, irregular ruts. Avoid a
solid dark ribbon, hard far-edge outlines, and puddle glints placed on steep slopes. Keep all texture
placement in world coordinates so scrolling does not make the road swim under the tires.

Align column count to a whole tile and mirror alternate tiles. Reuse the exact same painted edge at
both sides of each join. The panorama and midground also mirror adjacent repetitions. A prompt saying
"seamless" does not substitute for checking joins while scrolling.

The foreground bank pass clips below an irregular contour:

```text
lip(x) = visH(x) - 0.04 + sin(18.7*x)*0.018 + sin(7.3*x)*0.027
```

That restores real mud in front of sunk tire bottoms without a straight bitmap cutoff. Extend the
near ground with the soil tile on tall displays so no blank rectangle appears below the bank.
Current backdrop and midground horizontal parallax factors are `0.055` and `0.24`; ground/near props
are anchored to world coordinates. Shadows, subdued reflected vehicle art, wet glints and vegetation
overlap provide depth without a freely rotating camera.

## Camera and phone framing

Read current `camTarget`, `camFollow` and `resize` before changing framing. The approved baseline:

- Nose reference at chassis-local X `3.6 m`, framed near 76% of screen width.
- Ordinary view about `14.75 m` wide; close view about `13.25 m`, with a height cap (`VIEW = 1.25`
  in `resize()` zoomed out 25% from 11.8 m / 10.6 m to leave room behind the vehicle for long rigs).
- Ground fraction from bottom is `0.23` normally and `0.31` below 520 px viewport height, where the
  view is 8.4 m tall (6.7 m x `VIEW`) so the roof rack clears the top HUD.
- Camera height targets the terrain. Its vertical feed-forward is zero for the scout; feeding chassis
  vertical velocity into it makes the landscape shake with each suspension bounce.
- `camSnap()` runs after resize/zoom when the body exists, preventing transient off-screen framing.

Keep phone pedals and gear controls below the visible tire contact area. In the approved landscape
layout the pedals are 70 × 104 px and the range buttons form a horizontal row. Portrait uses a compact
HUD and reflowed controls. Test actual element bounds and images after viewport changes.

When browser tests advance physics many steps synchronously, snap or settle the camera before judging
a capture. Otherwise a test-only teleport can misleadingly show the scout far outside the frame.
