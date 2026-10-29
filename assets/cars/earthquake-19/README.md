# Earthquake 19

Status: **planned** · class `heavy`, tier 19 of 20 · 10×10, 5 axles · 86 t empty · 1442 kW · giant tires, 3.06 m
Load: **Reactor vessel**, 150 t

## Art brief

- Vehicle: forest green heavy-haul prime mover with a multi-axle lowbed
- Load (drawn as part of the vehicle): a huge reactor pressure vessel with radiation markings
- Equipment: hydraulic gooseneck hitch
- Finish: heavy grime and chipped paint
- Tires: 3.06 m giant mining tires: enormous mining-truck tires taller than a person, deep chevron tread

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, facing right, transparent, as a **strictly flat side profile** (the hard rule in AGENTS.md: no perspective, all tires the same size on one level line, no far-side tires)
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
