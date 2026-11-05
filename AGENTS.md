# Instructions for Codex: generate game art only

In this project Codex has one job: **generate images**. Claude wires them into the game.

- Do **not** edit anything in `src/`, `tools/`, `tests/`, `docs/`, `package.json`, the roster
  JSON files, or any `car.json` or `season.json`.
- Do not encode WebP files, build, tune physics or change rosters.
- Write only inside the `source/` folder of the item you were asked to generate (HUD icons go in
  `assets/hud/icons/`). When it is done, report the file list and stop.

## User-authorized tool access and persistence (2026-11-05)

The user explicitly grants full available tool and filesystem permissions for producing correct
game images, including updating this AGENTS.md. Use image inspection, measurement, masking,
compositing, alpha repair, registration, cropping, padding and resizing tools as needed. Python,
Pillow, OpenCV and equivalent image-processing tools are authorized for these corrections.
Use the built-in image generator for new painted artwork; tools may derive and repair the final
sprites from generated artwork. Install or run needed image-processing dependencies without
changing project dependencies. Scratch files and dependency caches may live outside the project;
project deliverables still belong in the requested item's source folder.

Keep working and regenerating until the requested master/body/wheel sets meet the art handoff
requirements in CLAUDE.md. There is no one-retry stopping limit. When a prompt repeats a defect,
change the method and use measured, deterministic corrections where appropriate instead of
repeating an ineffective prompt. Preserve originals and version every corrected deliverable.
Fix alpha and registration directly: retain unchanged master pixels outside road-wheel regions,
fill upper wheel wells through the measured hub line with opaque painted generated material,
and clear the space beneath the hubs. Tool-based resizing is allowed when needed, but validate
actual final dimensions and visual detail; do not claim resampling adds missing painted detail.
The accepted native 1254 x 1254 road-wheel exception remains in force.

This authorization concerns art production and this instruction update. Claude still handles
game integration; do not change gameplay, rosters, car.json, season.json or runtime WebP files.

Use the built-in image generation tool. Read the item's `README.md` for its brief, and match the
style of the approved Swamp Scout: [assets/references/four-scout-trucks.png](assets/references/four-scout-trucks.png),
[assets/cars/swamp-scout-4/source/](assets/cars/swamp-scout-4/source) and
[assets/seasons/swamp-summer/source/](assets/seasons/swamp-summer/source). The full art rules are in
[.claude/swamp-scout/references/generation-and-iteration.md](.claude/swamp-scout/references/generation-and-iteration.md).

## Style for every image

- Premium semi-realistic painted game illustration: readable dark contours, weathered materials,
  fine mechanical detail, rich natural texture. The same look as the Swamp Scout.
- **Flat side view facing right** (see the hard rule below): the camera perpendicular to the near
  side, no perspective. Soft, even daylight; no strong cast shadows.
- **True transparent background** for every object (vehicles, wheels, props). No
  checkerboard, no colored halo or glow around the edges, no ground or drop shadow, no text, logos or
  watermarks. Show the whole object with clear margins.
- PNG, at least 1500 px on the long side. **User-approved exception (2026-11-04):**
  square road-wheel sprites returned by the built-in generator at **1254 × 1254 px** are
  accepted at native resolution. Do not regenerate or upscale them solely to reach 1500 px.
  Masters and bodies still require at least 1500 px on the long side; all other art checks apply.

## Hard rule for every vehicle image: wheels that make sense

The wheels must suit the truck and its load, as on a real truck. Wheel layout is the most common reason a truck gets rejected and
redrawn, so check it before you report. Look at the approved layouts first:

- `assets/cars/fieldmaster-5/source/` and `assets/cars/swamp-ox-3/source/`: a close rear tandem right under the load.
- `assets/cars/crag-crusher-11/source/`: big, evenly spaced axles along the whole truck.
- `assets/cars/prime-mover-1/art/master.webp` and `assets/cars/atlas-8/art/master.webp`: a lowbed with a steer axle, a close drive tandem and a close
  group of 3 or 4 axles at the rear.

The rules:

- **Wheels carry the weight where it sits.** Every heavy part of the load has wheels under or right beside it. If you could
  remove the wheels and wonder what holds the load up, it is wrong.
- **Never one lone axle at the far end of a long trailer.** A trailer has at least a close tandem, set under the rear of the load.
- **Group wheels in close sets.** Axles in a tandem or bogie sit nearly tire to tire. Two sets of wheels spread far apart with a
  long empty stretch between them is fine; single axles scattered along the deck are not.
- **Long or heavy rigs get more axles:** at least 5 on a highway semi with a long trailer (steer, drive tandem, trailer tandem), and at
  least 5 on a heavy lowbed, more for a bigger load.
- **Tires in proportion** to the truck and the same on every axle, neither oversized nor undersized for the body.
- **The body has no defects:** clean panels, cab and fenders with no melted, fused or nonsensical shapes.

### Hard rule: believable cabs, front fenders and mirrors

- Use real heavy-truck construction and proportions. Default to a conventional cab with a
  visible short bonnet in side profile; do not invent a flat vertical cab front unless the
  brief explicitly calls for a cab-over. The bonnet, radiator housing, bumper, headlamp and
  front fender must be distinct, mechanically plausible parts with clean seams.
- Front wheel arches must follow the tire's round clearance. No axe-head shapes, pointed
  wedges, fused bumper/fender blocks, or melted panels above or ahead of the tire. Give the
  bumper a blunt, practical end and keep the complete road tire visible.
- Mirrors must be plausible side-view truck mirrors: correctly scaled rectangular housing,
  attached near the door/A-pillar by short rigid brackets. No floating mirrors, huge paddles,
  tangled or excessively long arms, or brackets that merge into ladders or fenders.
- Inspect the cab, mirror mounts and both ends of the front fender at full resolution before
  deriving a body. Include these construction requirements in every new vehicle prompt.
  Retain the strict perpendicular side camera: a believable bonnet does not permit a visible
  front grille face or a three-quarter camera.

Before reporting, look at the finished master and ask whether a truck driver would believe those wheels hold that load. If not, redraw it.

## Hard rule for every vehicle image: a flat side profile

Every vehicle picture (master, body, wheel, and any redo) must pass these checks before you report it.
A picture that fails one is rejected in review and drawn again, which wastes the whole generation, so
check your own output against this list first and regenerate before reporting.

- **Flat side profile, facing right.** The camera looks straight at the near side, perpendicular to
  it, at the height of the hubs. No three-quarter view, no elevated or tilted camera, no vanishing
  point or foreshortening. The cab's front face is not visible; only a sliver of roof may show.
- **All near-side tires the same size and perfectly round,** each rim centred in its tire. Tires do
  not shrink toward one end.
- **All hub centres on one horizontal line, all tire bottoms on one level ground line.** The
  chassis, deck, tank and load are horizontal: zero roll, zero yaw.
- **No far-side tires** peeking out below or between the near ones.
- **Every near-side tire fully visible,** none hidden behind steps, the cab or bodywork.
- **Exactly the axle count the brief gives,** with every axle's tires drawn the same.
- **The whole vehicle inside the canvas** with clear margins on all four sides; nothing (booms,
  masts, hoses, hooks) touches or crosses the edge.
- **The body is the master with the road wheels replaced by filled wheel wells, nothing else changed:** the same canvas size,
  position, scale and camera, so the two line up pixel for pixel.
- **Filled wheel wells:** every body image fills each wheel arch with an opaque, painted wheel-well
  interior (dark inner liner, chassis, axle and suspension parts) from the fender lip down to the hub
  line, including the gaps between tandem arches. The arch must never be transparent above the hub,
  because the tires move with the suspension and any hole shows the background. Below the hub line,
  and under the chassis, stays transparent.
- **The wheel is a square canvas, the tire a perfect circle centred in it,** seen face-on, matching
  the master's tires.
- **Breakdown trucks** show the rear winch drum, cable and hook.

Put these words in every vehicle prompt: "strictly flat 2D side profile, camera perpendicular to the
near side at hub height, no perspective, all tires the same size on one level line, no far-side tires".
Approved examples of the right camera: `assets/cars/bog-wrecker/source/` and
`assets/cars/breakdown-wrecker/source/`.

## What to generate

| Roster | Folder | What to make |
| --- | --- | --- |
| `assets/cars/cars.json` → `cars` (100) and `service` (10) | `assets/cars/<id>/source/` | vehicle **with its load**, body, wheel |
| `assets/hud/hud.json` | `assets/hud/icons/`, `assets/hud/source/` | SVG icons; garage art |
| a season's README | `assets/seasons/<id>/source/` | environment set |

Each folder's `README.md` has the brief and a checklist of exact file names. If the user does not say
what to make, do this first: the service trucks still marked `planned` (a fuel and a breakdown
truck for every class), then `turnpike-7` (see its README), then the cars in roster order.

## Cars: every vehicle carries its load in its own image

There are no separate trailers or loads. **A car and the load it hauls are one image**: the load
is part of the vehicle art, and only the road wheels are separate. The game moves the body, spins
and bounces the wheels, and handles the physics.

Loads grow with the vehicle (the brief names each one, `cars.json` gives its weight):

- **Scouts**: small loads in the bed or on the roof: four oil drums, cement blocks, firewood,
  jerry cans, calves, beehives...
- **Highway**: a tractor **with its semi-trailer drawn in**: box freight, fuel tanker, container,
  steel coils, a supercar carrier...
- **Heavy duty** and **off-road**: medium loads on the truck: logs, gravel, cable drums, an
  elephant in a crate, a space capsule...
- **Heavy**: a prime mover **with its multi-axle lowbed drawn in**, carrying a huge load: a ship
  hull, a rocket, a locomotive, a reactor vessel...

Draw the load securely on the vehicle (straps, chains, stakes, cradles or rails as the brief
suggests). Keep the real proportions from `lengthM`, `massT` and the load's size. Fun loads
(elephants, a giraffe, an orca) stay in the same painted, believable style: no cartoon faces.

## Cars and service trucks: `assets/cars/<id>/source/`

The brief is in `assets/cars/<id>/README.md`. Cars are ordered weakest to strongest (class, then
tier). Make stronger tiers look bigger and better equipped, and draw the tires the brief names (see
`assets/cars/wheel-types.json`). **Every new truck gets off-road tires:** plain mud-terrain, chained
(vary the chain style: ladder, diamond, V-bar or twin-ring tractor chains), steel spikes, all-terrain,
flotation or giant mining tires. No smooth highway road tires on new art (decided 2026-10-31). Service trucks (a breakdown truck per class, from
scout-sized pickups to 10×10 mining giants, each in its own colour and tires). Breakdown trucks carry a winch at
the **rear**: show the drum and hook clearly.

1. `vehicle-master-v1.png`: the complete vehicle with its load and every wheel, facing right. For a
   tractor with a trailer, the trailer is part of this one image.
2. `body-v1.png`: an **edit of the master**. Remove every road wheel and tire on the truck **and**
   the trailer, including glimpses of far-side tires. Fill each wheel well with an opaque painted
   inner liner, chassis, axle and suspension from the fender lip to the hub line, including gaps
   between tandem arches; never leave transparency above the hub. Below the hub line and under
   the chassis stays transparent (see the filled wheel wells hard rule above).
   Keep the exact same canvas size, position, scale and camera. Keep the load, the
   spare tire, body, chassis, suspension and equipment. Do not redesign or move anything.
3. `wheel-v1.png`: one road tire and rim matching the master, on a **square** transparent canvas,
   perfectly circular and **centred**, with equal margins and soft even light (it will spin). No
   axle, body or ground. Draw every axle's tires the same size in the master, because this one wheel
   is used on all of them.
4. `prompts.json`: `{ "master": {"prompt": "..."}, "body": {"edit_of": "vehicle-master-v1.png", "prompt": "..."}, "wheel": {"prompt": "..."} }`.

Loads are never animated or split into layers: the whole load is part of the body art. Animated
load layers (the Ice Breaker's orca, the Mountain Mover's submarine) were tried and dropped on
2026-10-29.

Before finishing, check that the body and master PNGs have identical
dimensions and that the wheel is square. Long rigs need a wide canvas; keep at least 1500 px across the whole vehicle.

## HUD and garage: `assets/hud/`

- Icons in `hud.json` → `icons`: write each as `assets/hud/icons/<id>.svg`. Use a 24×24 view box,
  simple strokes or fills in `currentColor` (except fixed brand colors such as the coin), no text,
  in the style of the existing icons in that folder.
- Art in `hud.json` → `art`: painted PNG masters at the listed `file` paths under `assets/hud/`,
  in the Swamp Scout style.

## Size cap

No vehicle may be longer than 16.8 m, load included. The heavy class, the Ice Breaker and ten highway trucks are being redrawn within it, so draw those rigs at that scale or smaller, keeping tires at about 1.3 m or more. Each planned truck's `README.md` repeats this.

## Seasons: `assets/seasons/<id>/source/`

Blackwater Swamp (`assets/seasons/swamp-summer/`) is the reference: copy its set of images for the new biome. The role list
and ready prompts are in `assets/seasons/SKILL.md`. **Hard rule: a simple, life-giving background behind a thick, detailed road.**

- `backdrop`: an opaque panorama, simple but full of life, with a flat calm band across the bottom third;
- `roadEdge`, `roadFar`: transparent strips for the road's front lip and far edge;
- `roadSoil`: opaque dark earth, calm enough for the HUD to sit on;
- road surfaces and `deepMud`: top-down seamless tiles;
- `mudHole`, `reeds`, `rock`, round obstacles and traced props: transparent.

Name them `<role>-v1.png` and record the prompts in `prompts.json`.

## Hard rule: validate one set before spending on a batch

Prompts are requests, not proof that the output meets the brief. Never generate a whole batch
and discover the same defect in every truck afterwards.

1. Before generating, record the exact axle count, tire diameter, maximum total length (load
   included), axle groups and intended canvas dimensions in `source/prompts.json`. Resolve any
   conflicting brief against the project-wide rules first. Specify total length in tire diameters
   (`totalLengthM / tireDiameterM`), not just a length in metres.
2. Prove the output path with ONE matching wheel first: inspect the actual PNG header and alpha,
   not the size written in the prompt. It must be square, at least 1500 pixels on each side
   (or native 1254 × 1254 under the user-approved wheel exception), circular and centred,
   with clean true transparency. If the tool returns an image below the applicable minimum,
   do not generate the remaining wheels with the same request and hope they will be larger.
3. Generate ONE master, inspect and measure it, then edit that accepted master into its body.
   Do not derive bodies from rejected masters. Do not start the next truck until this complete
   master/body/wheel set passes all checks below.
4. Check actual PNG dimensions: master and body must match exactly; every PNG must be at least
   1500 pixels on its long side, except native 1254 × 1254 road-wheel sprites as approved above.
   Inspect alpha edges on light and dark backgrounds, including
   internal gaps. Reject opaque backgrounds, colored fringe, halos, shadows and stray pixels.
5. Count road axles separately from wheels belonging to the load. Measure road tire diameters,
   hub centres and tire bottoms in the master. Check equal round tires, level hubs, exact axle
   count, close groups supporting the load, strict side profile and clear canvas margins.
   Calculate depicted total length from measured end-to-end pixels divided by measured tire
   diameter in pixels, multiplied by tire diameter in metres. It must be no more than 16.8 m;
   a length written in a prompt is not a measurement.
6. Compare master and body registration directly: identical dimensions alone are insufficient.
   Cab, load, panels and equipment must stay in the same pixel positions. Check all road tires
   are removed, load wheels remain, upper wheel wells and tandem gaps are opaque down to the
   hubs, and clearance below hubs stays transparent.
7. Save exact prompts, references/edit targets, measurements and pass/fail results immediately
   after each output. Mark failures `needs_revision`; never call them approved, ready or playable.
   Keep earlier versions and rejection reasons. Never discard prompt text because a batch is
   still running.

**Persistent correction workflow:** continue targeted regeneration and authorized tool-based
repair until the requested set passes. A repeated defect requires a changed method, such as
measured masks, alpha correction or compositing generated wheel-well material into the original
master. Prove that method on one complete set before continuing the batch. Do not silently relax
quality requirements or mark failed assets ready. Record every correction and its validation.

## Revisions

When Claude or the user rejects an image, generate a new version (`-v2`, `-v3`, ...) beside the old
one. Never overwrite. Add the new prompt and the rejection reason to `prompts.json`.
