# Ship Mover 2

Status: **planned** · class `heavy`, rank 2 of 20 · 8×8, 8 axles · 50 t empty · 500 kW · all-terrain tires, 1 m
Load: **Boat hull**, 80 t

Size: about 20 m long with its load. There is no length cap: draw it at its natural proportions (the game frames long vehicles with its zoom).

**Wheels (hard rule, see AGENTS.md):** 8 axles. Every tyre is a perfect circle (never oval or squashed), the same size, centred in its arch and filling it. Tractor with a steer axle and a drive axle or close drive tandem under the hitch; a close group of axles on the trailer under the load. Never one lone axle at the far end of a long trailer.

**Original design (hard rule, see AGENTS.md):** an original vehicle in the spirit of the kind described: no real make or model, no badges, logos, emblems, brand names or sponsor marks, and no copy of a real vehicle's exact shape, grille or lights.

## Art brief

- Vehicle: yellow self-propelled modular transporter: a flat platform on many small wheel pairs with a small control cab
- Load (drawn as part of the vehicle): a ship hull section
- Equipment: beacons, control cab
- Finish: shipyard grime
- Tires: 1.0 m all-terrain tyres: blocky all-terrain tread with sipes; perfectly round, every tyre the same size

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, facing right, transparent, as a **strictly flat side profile** (the hard rule in AGENTS.md: no perspective, every tyre a perfect circle of the same size on one level line, no far-side tyres)
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tyre on a square transparent canvas, hub centred, a perfect circle
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
