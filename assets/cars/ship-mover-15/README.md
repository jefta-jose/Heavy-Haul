# Ship Mover 15

Status: **planned** · class `heavy`, tier 15 of 20 · 8×8, 4 axles · 70 t empty · 1210 kW · giant tires, 2.68 m
Load: **Space telescope**, 11 t

## Art brief

- Vehicle: forest green heavy-haul prime mover with a multi-axle lowbed
- Load (drawn as part of the vehicle): a silver space telescope tube in a frame
- Equipment: roll cage, beacons and a giant bull bar
- Finish: heavy grime and chipped paint
- Tires: 2.68 m giant mining tires: enormous mining-truck tires taller than a person, deep chevron tread

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, facing right, transparent, as a **strictly flat side profile** (the hard rule in AGENTS.md: no perspective, all tires the same size on one level line, no far-side tires)
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
