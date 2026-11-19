# Monsoon 19

Status: **planned** · class `offroad`, rank 19 of 20 · 10×10, 5 axles · 24 t empty · 500 kW · mud-terrain tires, 1.7 m
Load: **Container**, 10 t

Size: about 12.6 m long with its load. There is no length cap: draw it at its natural proportions (the game frames long vehicles with its zoom).

**Wheels (hard rule, see AGENTS.md):** 5 axles. Every tyre is a perfect circle (never oval or squashed), the same size, centred in its arch and filling it. Wheels under the weight: evenly spaced axles or a close rear tandem, as this kind of truck has them.

**Original design (hard rule, see AGENTS.md):** an original vehicle in the spirit of the kind described: no real make or model, no badges, logos, emblems, brand names or sponsor marks, and no copy of a real vehicle's exact shape, grille or lights.

## Art brief

- Vehicle: black 10×10 heavy army flatbed
- Load (drawn as part of the vehicle): a container on the flatbed
- Equipment: crane, spare wheels
- Finish: weathered paint with dried mud
- Tires: oversized off-road mud-terrain: deep chunky mud lugs with open voids; perfectly round, every tyre the same size, no chains or spikes

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, facing right, transparent, as a **strictly flat side profile** (the hard rule in AGENTS.md: no perspective, every tyre a perfect circle of the same size on one level line, no far-side tyres)
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tyre on a square transparent canvas, hub centred, a perfect circle
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
