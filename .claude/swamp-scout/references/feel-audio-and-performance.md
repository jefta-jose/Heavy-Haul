# Wheel fit, driving feel, audio and smooth frames

Read before changing the vehicle art registration, drivetrain tuning, terrain obstacles, effects,
sound or render performance. These rules come from direct user feedback on the playable Swamp Scout;
each section records what was wrong, what fixed it, and the numbers that were approved. Source files:
[src/physics/](../../../src/physics) (drivetrain, terrain, obstacles), [src/render/](../../../src/render),
[src/audio/vehicle-audio.js](../../../src/audio/vehicle-audio.js), [src/game/view.js](../../../src/game/view.js),
[src/main.js](../../../src/main.js) and [car.json](../../../assets/cars/swamp-scout-4/car.json).

## Wheels must fill their arches

**Feedback:** the tires sat low in the arches, leaving a visible gap under each fender with springs,
liners and painted axle parts showing between flare and tread. The body and tires "did not make sense".

**Cause:** the tire radius (0.78 m) came from the master's tire silhouette, but the body edit had larger
empty arches, and a straight horizontal "upper body" redraw (local Y > 0.37) also painted the coil
spring tops over the tire.

**Fix procedure (repeat it for any new body or wheel art):**

1. Composite the actual body PNG over a plain background with a pixel grid, and crop each arch.
2. Find the fender flare's inner edge. Fit an arch circle `[x, y, r]` in body pixels for each arch.
3. Choose the tire radius and hub height so the tread top sits just inside the flare, roughly 5-15 px
   overlap at the apex. Keep the hub on the painted hub centre (here `(441, 695)` and `(1403, 695)`).
   Ground contact may move only a few pixels, so the body's ride height stays about the same.
4. Test it offline first: draw the scaled wheel, then the body, then the body with the arch circles cut
   out (`destination-out`). Inspect the composite before touching the game.
5. Store the result in `car.json` `rig`: `radius` (0.872), `wheelY` (-0.1915), `archCircles`. The renderer
   builds `C.over` from those circles, so the fenders draw over the tires while everything inside the arch
   stays behind the tread. Never use a straight horizontal occlusion line.
6. Run `npm test` (wheels settle at the registered ride height) and check a suspension capture.

**Hard rule: axles on the painted hubs.** Each axle's x in `rig.axles` is the hub centre measured in the
master (tire edges on rows just above the ground, cross-checked against the rim on a gridded crop),
converted with `bodyOrigin` and `pixelsPerMetre`, within 3 px. A wheel even 10-15 px off its hub reads
as sitting forward or back in its arch. See step 3 of the hook-up list in CLAUDE.md.

Far tires use a pre-darkened copy of the wheel, offset `(0.2, 0.13)`, scale 0.95.

## Driving feel: brisk take-off, smooth drive

Feedback arrived in two rounds:

1. "Acceleration is way too crazy for a SnowRunner feel." The scout was doing 0 to 28 km/h in 3 s.
2. After calming it: "the take off is way too slow; just the drive should be smooth."

The approved model ([drivetrain.js](../../../src/physics/drivetrain.js), values in `car.json` `drivetrain`):

| Parameter | Value | Why |
| --- | --- | --- |
| Torque curve | 0.17 x heavy diesel | weight without launching |
| Torque converter | x(1 + 1.1 * max(0, 1 - wheelRpm/1000)) | firm launch that fades as the drive couples |
| Throttle spool | 1.8 /s rise, 3 /s fall | responsive pedal |
| Drive-speed ramp `st.rpmCmd` | 420 + 1300 * max(0, 1 - wheelRpm/1100) rpm/s | fast from rest, smooth once rolling |
| Gears H / L / R | 15 / 46 / 36, governor 2300 rpm | low range crawls and pulls |

Target numbers from `npm run feel` (firm ground, H): about 7 km/h at 1 s and 15 km/h at 2 s, then
a smooth rise toward 20-23 km/h. L reaches about 16 km/h within 1-2 s. Limit acceleration through the
commanded drive speed and the converter, not only by cutting torque. Cutting torque alone made mud and
climbs impossible and the launch sluggish.

## 4x4 and DIFF must be felt

**Feedback:** toggling 4x4 and DIFF changed nothing. The user asked to feel it, plus a green outline
when switched on and a red one when switched off.

- Mud grip is patchy per tire. A `pre-solve` listener sets contact friction to `mu * mudPatch(x)`
  (0.55-1.05). Each tire in mud also gets a bog drag (`MUD_BOG` 3000 N per tire, scaled by
  `tanh(v / 0.35)`) plus a 700 N·s/m suction.
- An open diff caps every driven wheel to the weakest tire's grip (factor 1.0 for the scout).
- The scout starts with both modes off. Deep-mud progress over 15 s in L should be roughly: off/off 3 m,
  4x4 only 7 m, DIFF only 5 m, both on 40+ m. Keep that spread when retuning.
- Feedback when toggling: `renderer.flash(on)` traces the body and near-tire silhouettes, offset in eight
  directions at 0.075 m and 0.04 m, in green `#39e66a` or red `#ff3b30`, pulsing for 1.5 s. The audio
  plays a clunk at the same time.

## Terrain that is fun to drive

The user asked for more bumps, logs and rocks to climb over, and potholes to drop into and climb out of.
All obstacles are physical, and the art sits exactly on the physics shapes.

- Washboard runs (0.11-0.22 m bumps), small potholes, and **deep potholes** 2.6-3.5 m wide and
  0.34-0.5 m deep. They must be wider than the 1.74 m tire, or the tire bridges them instead of dropping in.
- Stepped climbs: two or three ledges with a long ramp down, faces kept under about 40 degrees
  (`stepFace`). Rock zones have ledges, slabs and potholes.
- Climbable boulders on every firm section (0.3-0.58 m proud). Crushable shale rocks break after about
  900 N·s of tire impulse, then spawn chunks, dust and a crunch sound.
- Fallen logs: static circles r 0.2-0.33 m. In mud they are smaller and half sunk, because a full log in
  bog stopped the scout dead from a standstill. Drawing: a bark band receding toward the far verge
  behind the vehicle, plus a sawn end cap with rings in front of the near tires.
- No winch posts: the four heavy-mud pits (`heavyMud`, 18 m wide, 0.6 m deep bowls) are where the
  player calls a breakdown or fuel truck and winches out. Service trucks are sized to the main
  truck (`towMassT`), the cable reaches only 18 m so both trucks are on screen (farther, it says "Too far away"), the winch reels in at about 1 m/s with at most 1.5× the truck's weight
  (a full-force winch yanked a scout 10 m in half a second), and the service truck stays parked.
- Steeper hills (2026-10-26): climbs and drops up to about 17% on rock and dirt, while mud stretches
  stay nearly flat. A 9% grade through deep mud stalled the scout completely.
- Keep calm zones at the start, the fuel stop and the depot. After any terrain change, run
  `npm run test:route` (it calls a breakdown truck when properly stuck). Too-tall mud ruts once made
  a mud exit impassable.

## Effects

All effects are pooled world-space particles (max 520): puff sprites pre-rendered once as radial
gradients, drops, and rotating chunks.

- Exhaust from `rig.exhaust`: light haze at idle, dark puffs on throttle or rising rpm.
- Tire dust on dirt, gravel and rock, scaled by speed and slip. Mud flecks and mud puffs when spinning.
- Water: a splash burst on entry, then a bow wave, rooster tail and spray while wading. A translucent
  water surface is drawn in front of the vehicle so the tires read as submerged.
- A per-surface road lane makes the drivable line clear: wet mud, ground soil and granite textures
  (squashed for the elevated view), cross-faded at zone edges, with tire ruts and a crisp far edge.

## Audio (`src/audio/`, recorded sound)

History: a synthesized engine was rejected as "horrible"; Codex's per-truck CC0 recordings were
approved. On 2026-10-28 the user asked for: no audible loop restarts, a sound per truck class (a
Dodge Ram for scouts), the load shaking on rock hits instead of a "beep", air/hydraulic brake hiss,
a handbrake with its sound, smoother water and mud, and birds and crows in certain sections.
Read [assets/audio/README.md](../../../assets/audio/README.md) for the recordings and the recipe.

- One engine per class from `assets/audio/sounds.json` → `tools/prepare-audio.py` → `assets/audio/bank/`
  (MP3 + bank.json, ~10 MB). Layers idle / drive / pull plus start and optional stop clips.
- **Never play a short recording on `loop = true`**: the user hears the restart. Every bed goes
  through `loop-player.js` (random-offset grains, equal-power crossfades). Prep levels each layer
  so grains match. Rhythmic sources (wading, mud footsteps) become `texture` beds offline.
- Rock hits and bumps play the underbody thump and the load shaking (chains, metal, wood by weight),
  not a tone. Water is low-passed and smooth. The only synthesized sounds are the back-up beeper and
  the cab switch clicks.
- No synthesis of engines, and no piercing tonal layers over the recordings.
- ENGINE / I, PARK / B (handbrake holds all wheels), starter state, parked engines and volume
  persistence (master, engine, effects, ambience) are covered by tests.
- `npm run audio:preview` renders each engine's drive and 40 s of every bed through the game's own code
  to `output/audio/` with a loudness report (the quietest over the loudest second shows unevenness).
  Numbers cannot approve timbre: listen on speakers and headphones.

## Smooth frames

**Feedback:** the game lagged badly, and later "flashed black twice right after starting".

Causes and fixes:

| Cost | Fix |
| --- | --- |
| Rotating 1254 px wheels and an 1774 px body with high-quality filtering every frame | Resample every sprite once per zoom level (`prepare()`, step-down halving), including the reeds, logs, rocks, backdrop and midground |
| `ctx.filter = 'brightness()'` on far tires | Pre-darkened wheel canvas |
| `backdrop-filter: blur()` on HUD pills over an animated canvas | Removed; the panels are slightly more opaque |
| Bank drawn in 0.06 m columns, plus a second full-width lip pass | 0.25 m columns (the height-field spacing); lip pass only within ±5 m of the vehicle |
| Gradients and patterns created every frame | Cached in `prepare()` |
| Canvas at DPR 2 | DPR capped at 1.5; adaptive quality drops to 0.85 or 0.7 if frames average over 25 ms for 3 s |
| Gauges redrawn every frame | 30 Hz |

**2026-10-31, "very slow on mobile and Chrome, smooth on Firefox":** Chrome pays per pixel for
mipmapped filtering, clipped translucent pattern fills and full-screen overdraw, which Firefox's
WebRender absorbs. Frames in headless Chromium went from 34-50 ms to 7-15 ms, with an identical look:

| Cost | Fix |
| --- | --- |
| `imageSmoothingQuality = 'medium'` on the main canvas (Chrome mipmaps every draw, about 40% of the frame) | `'low'`: sprites are already resampled to screen size. Keep `'medium'` only around pattern fills that shrink their texture a lot (deep soil, log bark) |
| Sky fill, fog gradient, clipped forest floor with 12 alpha strips, midground with `globalAlpha`: about 6 full-screen passes | Fog baked into the cached backdrop (opaque, so no sky fill); midground opacity baked in; forest floor cached in 8 m chunks relative to the horizon; backdrop and midground cached at their on-screen height and blitted 1:1 at whole device pixels |
| Road lane: six clipped translucent pattern bands per zone slice every frame | Painted once into the cached bank chunks (it never changes) |
| Deep soil pattern filled under the whole bank | Filled only below the bank's bottom edge (the bank art is opaque from its contact row down) |
| Mud foreground redrew both rut tracks and the bubbles | Only the near track (the far one and the bubbles never reach below the lip) |
| Main canvas with alpha | `getContext('2d', { alpha: false })` |

**2026-10-31, "achieve the smoothness and quality of Hill Climb Racing" on phones:**

- Frames are drawn between physics steps (`src/game/interpolate.js`): every `sim.step` records the
  state it starts from, and each frame blends the bodies by `acc / DT` through instance getter
  overrides that are removed right after drawing, so physics stays deterministic. Without it a 90 Hz
  phone alternates one and two steps per frame and the truck stutters.
- A finger is full pedal while it is down; only a mouse eases off by dragging and a pen uses pressure.
  Thumbs drifting on the old drag-to-ease pedal silently lost power.
- Touch screens under 520 px tall cap the pixel ratio at 1.25, and adaptive quality steps down after
  2 s under 50 fps (desktop: 3 s under 40 fps).
- Haptics (`src/game/haptics.js`, Android browsers only): gear and drive-mode ticks, hard hits, winch hook-on,
  low fuel.
- Phone HUD (the block at the end of `game.css`): fuel bar, depot distance, service and pause buttons,
  big corner pedals, one dial, gears above the gas. Details, engine and fullscreen live in the pause
  menu; ENGINE shows on the HUD only while the engine is off; status toasts are `hud.hint`s shown
  three times per device. Keep new HUD items off phones unless a thumb needs them while driving.

**First phone log (Infinix X6531, Mali-G52, 4 GB, 90 Hz):** 23 fps. Physics took 22 ms a frame
(4.9 ms per 120 Hz step, so frames fell behind and ran more steps), and new road chunks stalled
100-180 ms about once a second. Fixes: all 100 hinged bridge boards on the trail were simulated
every step (a hinged chain never sleeps), so bridges were made rigid static decks, as in SnowRunner
(`src/physics/bridges.js`; physics per step 0.73 → about 0.25 ms on desktop); road, forest-floor and mud chunks are built one ahead in the direction of travel,
at most one per frame (`cache.built`). (The in-game recorder that produced that log was removed
with the Android app on 2026-10-31; profile in desktop DevTools now.)

Rules: never set a high smoothing quality on the main canvas, and never draw a full-screen layer or a
clipped translucent pattern every frame when it could be cached in world-space or screen-space chunks.

**Black-flash rule:** resizing a canvas clears it. The adaptive-quality step used to call `resize()`
after drawing, and it fired during the naturally slow first seconds (cache building, ignition), so the
screen flashed black twice. Now:

- adaptation is ignored for the first 5 s of play;
- it needs 3 s of sustained slowness;
- the resize is deferred with `pendingResize` and runs at the start of the next frame, before drawing.

To profile, record a few seconds in the browser's Performance panel on a real GPU (on a phone: `chrome://inspect` remote debugging). Headless
SwiftShader collects the whole raster cost in whichever draw call flushes, so its per-stage timings
mislead; compare whole frames (draw, then `getImageData(0, 0, 1, 1)` to flush) with one layer skipped at a
time, against a baseline build in a git worktree.

## Framing

- Nose at 76% of the screen width; it was 91%, and the user said the car was "way too forward".
- Zoomed out 25% (`VIEW = 1.25`, 14.75 m of trail across the screen). The user found 11.8 m too close,
  and long rigs (a tractor with its trailer drawn in) need the room behind the vehicle. Scale `VIEW`; do not edit the base widths.
- Below 520 px height: view height 6.7 m x `VIEW` and ground fraction 0.31, so the roof rack clears the top HUD.
- The specification card fades after 6 s of play, so it does not cover the rear of the vehicle.
