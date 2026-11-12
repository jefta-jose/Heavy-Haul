# Trail Cat 6

Status: **planned** · class `scout`, rank 6 of 20 · 4×4, 2 axles · 1.9 t empty · 150 kW · mud-terrain tires, 0.95 m
Load: **Recovery kit**, 0.08 t

Size: about 4 m long with its load. There is no length cap: draw it at its natural proportions (the game frames long vehicles with its zoom).

**Wheels (hard rule, see AGENTS.md):** 2 axles. Every tyre is a perfect circle (never oval or squashed), the same size, centred in its arch and filling it. One wheel in each arch, where this kind of vehicle has them.

**Original design (hard rule, see AGENTS.md):** an original vehicle in the spirit of the kind described: no real make or model, no badges, logos, emblems, brand names or sponsor marks, and no copy of a real vehicle's exact shape, grille or lights.

## Art brief

- Vehicle: bright orange open-top short-wheelbase rock-crawler 4×4 with a tube roll cage, half doors and wide fender flares
- Load (drawn as part of the vehicle): a high-lift jack and two recovery boards strapped to the roll cage
- Equipment: stubby steel winch bumper, rock sliders
- Finish: scratched paint and red-dirt dust
- Tires: 0.95 m mud-terrain tyres: deep chunky mud lugs with open voids; perfectly round, every tyre the same size

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, facing right, transparent, as a **strictly flat side profile** (the hard rule in AGENTS.md: no perspective, every tyre a perfect circle of the same size on one level line, no far-side tyres)
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tyre on a square transparent canvas, hub centred, a perfect circle
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
