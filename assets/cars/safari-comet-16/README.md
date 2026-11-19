# Safari Comet 16

Status: **planned** · class `scout`, rank 16 of 20 · 4×4, 2 axles · 2.6 t empty · 260 kW · all-terrain tires, 1.3 m
Load: none

Size: about 4.6 m long. There is no length cap: draw it at its natural proportions (the game frames long vehicles with its zoom).

**Wheels (hard rule, see AGENTS.md):** 2 axles. Every tyre is a perfect circle (never oval or squashed), the same size, centred in its arch and filling it. One wheel in each arch, where this kind of vehicle has them.

**Original design (hard rule, see AGENTS.md):** an original vehicle in the spirit of the kind described: no real make or model, no badges, logos, emblems, brand names or sponsor marks, and no copy of a real vehicle's exact shape, grille or lights.

## Art brief

- Vehicle: sky blue rear-engine sports coupe raised on long-travel safari suspension with flared arches
- Load: none
- Equipment: roof rack with a spare wheel, light pod on the bonnet
- Finish: light dust and mud spatter
- Tires: oversized off-road all-terrain: blocky all-terrain tread with sipes; perfectly round, every tyre the same size, no chains or spikes

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle, all wheels on, facing right, transparent, as a **strictly flat side profile** (the hard rule in AGENTS.md: no perspective, every tyre a perfect circle of the same size on one level line, no far-side tyres)
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed
- [ ] `source/wheel-v1.png`: one matching tyre on a square transparent canvas, hub centred, a perfect circle
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics, drivetrain) and `status: "playable"`.
