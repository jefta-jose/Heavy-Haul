# Instructions for Codex: generate game art only

In this project Codex has one job: **generate images**. Claude wires them into the game.

- Do **not** edit anything in `src/`, `tools/`, `tests/`, `docs/`, `package.json`, the roster
  JSON files, or any `car.json` or `season.json`.
- Do not encode WebP files, build, tune physics or change rosters.
- Write only inside the `source/` folder of the item you were asked to generate (HUD icons go in
  `assets/hud/icons/`). When it is done, report the file list and stop.

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
- PNG, at least 1500 px on the long side.

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
- **The body is the master with the wheels removed, nothing else changed:** the same canvas size,
  position, scale and camera, so the two line up pixel for pixel.
- **The wheel is a square canvas, the tire a perfect circle centred in it,** seen face-on, matching
  the master's tires.
- **Fuel trucks have no winch;** breakdown trucks show the rear winch drum, cable and hook.

Put these words in every vehicle prompt: "strictly flat 2D side profile, camera perpendicular to the
near side at hub height, no perspective, all tires the same size on one level line, no far-side tires".
Approved examples of the right camera: `assets/cars/bog-wrecker/source/` and
`assets/cars/fuel-runner-6x6/source/`.

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
tier). Make stronger tiers look bigger and better equipped, and draw the tires the brief names (road,
all-terrain, mud-terrain, flotation, snow chains, steel spikes, giant mining tires; see
`assets/cars/wheel-types.json`). Service trucks (a fuel and a breakdown truck per class, growing from
scout-sized pickups to 10×10 mining giants, each in its own colour and tires). Breakdown trucks carry a winch at
the **rear**: show the drum and hook clearly. Fuel trucks only refuel: hose reels and beacons, no
winch.

1. `vehicle-master-v1.png`: the complete vehicle with its load and every wheel, facing right. For a
   tractor with a trailer, the trailer is part of this one image.
2. `body-v1.png`: an **edit of the master**. Remove every road wheel and tire on the truck **and**
   the trailer, including glimpses of far-side tires, and leave the wheel arches empty and
   transparent. Keep the exact same canvas size, position, scale and camera. Keep the load, the
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

## Seasons: `assets/seasons/<id>/source/`

Follow the list in the season's `README.md`, with `swamp-summer` as the template:

- `backdrop`: opaque panorama;
- `midground`: transparent trees, rooted on a horizontal baseline;
- `bank`: a wide side-view ground strip, transparent above an irregular far crest, opaque below,
  with a broad drivable band;
- `ground`: a top-down seamless tile;
- props (reeds/shrubs), a `log` and a `rock`: transparent;
- lane materials: top-down seamless tiles for each surface.

Name them `<role>-v1.png` and record the prompts in `prompts.json`.

## Revisions

When Claude or the user rejects an image, generate a new version (`-v2`, `-v3`, ...) beside the old
one. Never overwrite. Add the new prompt and the rejection reason to `prompts.json`.
