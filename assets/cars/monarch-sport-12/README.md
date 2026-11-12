# Monarch Sport 12

Status: **planned** · class `scout`, rank 12 of 20 · AWD, 2 axles · 2.3 t empty · 423 kW · all-terrain tires, 0.95 m
Load: **Roof box**, 0.12 t

Size: about 4.9 m long with its load. There is no length cap: draw it at its natural proportions (the game frames long vehicles with its zoom).

**Wheels (hard rule, see AGENTS.md):** 2 axles. Every tyre is a perfect circle (never oval or squashed), the same size, centred in its arch and filling it. One wheel in each arch, where this kind of vehicle has them.

**Original design (hard rule, see AGENTS.md):** an original vehicle in the spirit of the kind described: no real make or model, no badges, logos, emblems, brand names or sponsor marks, and no copy of a real vehicle's exact shape, grille or lights.

## Art brief

- Vehicle: British racing green luxury performance SUV with a floating black roof, slim light strips and side vents
- Load (drawn as part of the vehicle): a roof box and a spare wheel on crossbars
- Equipment: roof rails, tow hook
- Finish: polished paint with mud on the sills
- Tires: 0.95 m all-terrain tyres: blocky all-terrain tread with sipes; perfectly round, every tyre the same size

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, facing right, transparent, as a **strictly flat side profile** (the hard rule in AGENTS.md: no perspective, every tyre a perfect circle of the same size on one level line, no far-side tyres)
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tyre on a square transparent canvas, hub centred, a perfect circle
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
