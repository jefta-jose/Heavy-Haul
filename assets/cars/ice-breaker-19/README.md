# Ice Breaker 19

Status: **playable** · class `offroad`, tier 19 of 20 · 8×8, 8 axles · 23.1 t empty · 543 kW · spiked tires, 2 m
Load: **Orca aquarium**, 20 t

## Art brief

- Vehicle: racing green all-terrain 8×8 cargo truck
- Load (drawn as part of the vehicle): a glass aquarium with a friendly orca, water sloshing
- Equipment: crane boom and recovery spades
- Finish: frost, road-salt crust and dried mud
- Tires: 2.00 m spiked studs: winter tires studded with rows of steel spikes

Approved: `source/vehicle-master-v2.png`, `source/body-v1.png`, `source/wheel-v1.png`
(1920 × 819; the wheel is square).

## Animated load layers (requested 2026-10-28)

The orca should swim and the water slosh with the truck's motion. Follow AGENTS.md → *Animated load
layers*. Every file below is an **edit of `source/body-v1.png`**, at exactly **1920 × 819 px**, strictly
side-on and facing right like the body, with every part at the exact pixel position, size and angle
it has in `body-v1.png`. Nothing is cropped, recentred, rotated or rescaled.

Where things are in `body-v1.png` (pixels, left/top/right/bottom):

- glass tank, inside the steel frame: about **228, 225 → 1252, 465**. The front glass is a flat,
  vertical, side-on pane: it must stay a flat rectangle, not a box seen at an angle;
- water: fills the tank from the surface line at about **y 235–250** down to the tank floor;
- orca: about **405, 228 → 1048, 462**, nose pointing right, horizontal, fully side-on.

### Codex delivers

- [ ] `source/body-v2.png`: `body-v1.png` with the **orca removed** and the water left empty. Fill
  where the orca was with the same water: the same blue gradient, light ripples, bubbles and caustics
  as the rest of the tank, continuing seamlessly. Keep the waterline, the air gap above it, the glass,
  the steel frame, posts, straps, bolts and the whole truck **pixel-identical** to `body-v1.png`. The
  wheel arches stay empty and transparent.
- [ ] `source/orca-v1.png`: **only the orca**, cut out from `body-v1.png` (not a new drawing): the
  same animal, pose, size, colours and lighting, at its exact position on the 1920 × 819 canvas.
  Everything else fully transparent: no water, glass, bubbles, frame or shadow around it, and no
  halo. Clean edges along the fins.
- [ ] `source/water-surface-v1.png`: **only the top band of water**: the wavy surface line with its
  white foam and ripples, from the air gap down about 45 px, across the full inside width of the tank
  (x about 228 → 1252), at its exact position. Transparent above and below, and no glass frame, posts
  or straps over it. The game moves this band to show the water sloshing.
- [ ] `source/prompts.json`: add `body-v2`, `orca-v1` and `water-surface-v1`, each with
  `"edit_of": "body-v1.png"`, the exact prompt, the canvas size and the part's pixel bounds.

Do not change `body-v1.png`, the master, the wheel, `car.json` or anything outside `source/`.

### Result (2026-10-28)

The image generator could not keep pixel registration (it redraws the whole picture), so Codex's
`body-v2`, `orca-v1`, `orca-v2` and `water-surface-v1` were rejected (the last three are deleted;
`body-v2` stays as the script's empty-tank fill source). The layers were instead **cut from
the approved `body-v1.png`** by `tools/art/ice-breaker-layers.py`, with exact registration:
`body-v3.png` (empty tank), `orca-v3.png`, `water-surface-v2.png` and `tank-front-v1.png` (frame bars,
posts and straps drawn over the water). Rebuild them with the command at the top of that script.

### In the game

`car.json` → `rig.tank` (`rect`, `surface` rows, `pivot`) registers the layers; `art` lists `orca`,
`waterSurface` and `tankFront`, and `body` uses `body-v3`. `src/render/layers/live-load.js` animates
them: the water surface tilts against acceleration and braking, stays level when the truck pitches,
bounces on bumps and ripples; the orca swims gently and lags behind the truck's motion; hard sloshes
throw spray over the rim (particles only, no sound).

## Claude hooks it up (see CLAUDE.md)

Use `body-v3` + `orca-v3` + `water-surface-v2` + `tank-front-v1` (they rebuild `body-v1` exactly), then
encode to `art/*.webp`, register the tank in `car.json`, and animate the swim and slosh from the
truck's acceleration, pitch and bumps.
