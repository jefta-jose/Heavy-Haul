# Sand Viper 18

Status: **planned** · class `scout`, rank 18 of 20 · 4×4, 2 axles · 2.6 t empty · 537 kW · all-terrain tires, 1.05 m
Load: **Bed spares**, 0.15 t

Size: about 5.9 m long with its load. There is no length cap: draw it at its natural proportions (the game frames long vehicles with its zoom).

**Wheels (hard rule, see AGENTS.md):** 2 axles. Every tyre is a perfect circle (never oval or squashed), the same size, centred in its arch and filling it. One wheel in each arch, where this kind of vehicle has them.

**Original design (hard rule, see AGENTS.md):** an original vehicle in the spirit of the kind described: no real make or model, no badges, logos, emblems, brand names or sponsor marks, and no copy of a real vehicle's exact shape, grille or lights.

## Art brief

- Vehicle: matte grey wide-body desert pre-runner crew-cab pickup with long-travel suspension, huge flared fenders and a bonnet scoop
- Load (drawn as part of the vehicle): a spare wheel and two jerry cans strapped upright in the open bed
- Equipment: roof light pod, bed bars
- Finish: fine desert sand on the lower panels
- Tires: 1.05 m all-terrain tyres: blocky all-terrain tread with sipes; perfectly round, every tyre the same size

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, facing right, transparent, as a **strictly flat side profile** (the hard rule in AGENTS.md: no perspective, every tyre a perfect circle of the same size on one level line, no far-side tyres)
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tyre on a square transparent canvas, hub centred, a perfect circle
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
