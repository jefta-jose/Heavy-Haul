# Crane Titan 11

Status: **planned** · class `heavy`, rank 11 of 20 · 12×12, 6 axles · 60 t empty · 700 kW · all-terrain tires, 1.7 m
Load: none

Size: about 16 m long. There is no length cap: draw it at its natural proportions (the game frames long vehicles with its zoom).

**Wheels (hard rule, see AGENTS.md):** 6 axles. Every tyre is a perfect circle (never oval or squashed), the same size, centred in its arch and filling it. Wheels under the weight: evenly spaced axles or a close rear tandem, as this kind of truck has them.

**Original design (hard rule, see AGENTS.md):** an original vehicle in the spirit of the kind described: no real make or model, no badges, logos, emblems, brand names or sponsor marks, and no copy of a real vehicle's exact shape, grille or lights.

## Art brief

- Vehicle: yellow-and-black 12×12 all-terrain crane with the boom stowed
- Load: none
- Equipment: boom, outriggers
- Finish: scuffed rock-rash on the sills
- Tires: oversized off-road all-terrain: blocky all-terrain tread with sipes; perfectly round, every tyre the same size, no chains or spikes

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle, all wheels on, facing right, transparent, as a **strictly flat side profile** (the hard rule in AGENTS.md: no perspective, every tyre a perfect circle of the same size on one level line, no far-side tyres)
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed
- [ ] `source/wheel-v1.png`: one matching tyre on a square transparent canvas, hub centred, a perfect circle
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics, drivetrain) and `status: "playable"`.
