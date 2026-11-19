# Iron Ore 14

Status: **planned** · class `heavy`, rank 14 of 20 · 4×4, 2 axles · 56 t empty · 850 kW · giant tires, 3.2 m
Load: **Iron ore**, 55 t

Size: about 11.5 m long with its load. There is no length cap: draw it at its natural proportions (the game frames long vehicles with its zoom).

**Wheels (hard rule, see AGENTS.md):** 2 axles. Every tyre is a perfect circle (never oval or squashed), the same size, centred in its arch and filling it. One wheel in each arch, where this kind of vehicle has them.

**Original design (hard rule, see AGENTS.md):** an original vehicle in the spirit of the kind described: no real make or model, no badges, logos, emblems, brand names or sponsor marks, and no copy of a real vehicle's exact shape, grille or lights.

## Art brief

- Vehicle: mining yellow two-axle mining hauler
- Load (drawn as part of the vehicle): iron ore in the body
- Equipment: handrails
- Finish: fresh red-clay splashes
- Tires: oversized off-road giant mining tires: enormous mining-truck tires taller than a person, deep chevron tread; perfectly round, every tyre the same size, no chains or spikes

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, facing right, transparent, as a **strictly flat side profile** (the hard rule in AGENTS.md: no perspective, every tyre a perfect circle of the same size on one level line, no far-side tyres)
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tyre on a square transparent canvas, hub centred, a perfect circle
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
