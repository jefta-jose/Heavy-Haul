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

The wheels must suit the vehicle and its load, as on the real kind of vehicle. Wheel layout is the most common reason a vehicle gets rejected and
redrawn, so check it before you report.

The rules:

- **Every tyre is a perfect circle** (decided 2026-11-12, the one rule the user insists on): never oval, squashed, stretched or
  tilted, every tyre the same size, each centred in its arch and filling it as the real vehicle's would. Measure it: the tyre's
  width and height in the master must match to within 2 %.

- **Wheels carry the weight where it sits.** Every heavy part of the load has wheels under or right beside it. If you could
  remove the wheels and wonder what holds the load up, it is wrong.
- **Never one lone axle at the far end of a long trailer.** A trailer has at least a close tandem, set under the rear of the load.
- **Group wheels in close sets.** Axles in a tandem or bogie sit nearly tire to tire. Two sets of wheels spread far apart with a
  long empty stretch between them is fine; single axles scattered along the deck are not.
- **Long or heavy rigs get more axles:** at least 5 on a highway semi with a long trailer (steer, drive tandem, trailer tandem), and at
  least 5 on a heavy lowbed, more for a bigger load.
- **Tires in proportion** to the vehicle and the same on every axle, neither oversized nor undersized for the body: a supercar's
  tyres fit a supercar's arches, a mining truck's fit a mining truck's.
- **The body has no defects:** clean panels, cab and fenders with no melted, fused or nonsensical shapes.

### Hard rule: believable cabs, front fenders and mirrors

- Use the real construction and proportions of the kind of vehicle in the brief. For a truck, default to a conventional cab with a
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
near side at hub height, no perspective, every tyre a perfect circle of the same size on one level line, no far-side tires".

## Hard rule: original designs

The roster is inspired by kinds of real vehicles (SnowRunner trucks, Forza Horizon off-roaders, rally cars, supercars, mining
giants), but this is a commercial game: draw **original vehicles in the spirit of the kind described**. No real make or model,
no badges, logos, emblems, brand or sponsor names, and no copy of a real vehicle's exact shape, grille or lights. Never put a
real make or model name in a prompt.

## What to generate

| Roster | Folder | What to make |
| --- | --- | --- |
| `assets/cars/cars.json` → `cars` (100) and `service` (5) | `assets/cars/<id>/source/` | vehicle (with its load, if it has one), body, wheel |
| `assets/hud/hud.json` | `assets/hud/icons/`, `assets/hud/source/` | SVG icons; garage art |
| a season's README | `assets/seasons/<id>/source/` | environment set |

Each folder's `README.md` has the brief and a checklist of exact file names. If the user does not say
what to make, do this first: each class's rank 1 starter and its breakdown truck, then the cars in rank order.

## Cars: every kind of vehicle, some with loads

The roster (rebuilt 2026-11-12) is deliberately varied: classic and modern 4×4s, SUVs, pickups, buggies, UTVs, rally cars and
supercars on off-road tyres among the scouts; vans, fast SUVs, grand tourers, rigid trucks and semi tractors with their trailers on
the highway; work trucks, army 6×6s and 8×8s, amphibians, swamp buggies, Arctic haulers, cranes and mining giants further up.

**Many vehicles carry nothing**: draw them alone. **Those with a load carry it in their own image** (the brief names it, `cars.json`
gives its weight): there are no separate trailers or loads, so a tractor and its trailer, or a pickup and the bales in its bed, are
one picture, and only the road wheels are separate. The game moves the body, spins and bounces the wheels, and handles the physics.
Draw a load securely on the vehicle (straps, chains, stakes, cradles or rails) in real proportions.

## Cars and service trucks: `assets/cars/<id>/source/`

The brief is in `assets/cars/<id>/README.md`. Cars are ordered weakest to strongest (class, then
rank). Draw the tires the brief names (see `assets/cars/wheel-types.json`): all-terrain, mud-terrain, steel
spikes, flotation or giant mining tires, and road tyres only where the brief says so. **No snow chains** (dropped on 2026-11-12:
they never came out right). Service trucks (a breakdown truck per class, from
scout-sized pickups to 10×10 mining giants, each in its own colour and tires). Breakdown trucks carry a winch at
the **rear**: show the drum and hook clearly.

1. `vehicle-master-v1.png`: the complete vehicle (with its load, if it has one) and every wheel, facing right. For a
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
dimensions and that the wheel is square. Long rigs need a wide canvas; keep at least 1500 px across the whole vehicle, and the tyres perfect circles however long it is.

## HUD and garage: `assets/hud/`

- Icons in `hud.json` → `icons`: write each as `assets/hud/icons/<id>.svg`. Use a 24×24 view box,
  simple strokes or fills in `currentColor` (except fixed brand colors such as the coin), no text,
  in the style of the existing icons in that folder.
- Art in `hud.json` → `art`: painted PNG masters at the listed `file` paths under `assets/hud/`,
  in the Swamp Scout style.

## No size cap

There is no length cap any more (dropped on 2026-11-12): draw every vehicle at its natural proportions, a 4 m buggy or a 26 m road
train. The game frames each vehicle by its length and has a zoom button for the player. What still matters is that the tyres are
perfect circles and fit the vehicle.
