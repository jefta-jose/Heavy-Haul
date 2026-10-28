# Reactor Runner 17

Status: **planned** · class `heavy`, tier 17 of 20 · 10×10, 5 axles · 77.9 t empty · 1326 kW · giant tires, 2.89 m
Load: **Full rocket**, 80 t

## Art brief

- Vehicle: signal red heavy-haul prime mover with a multi-axle lowbed
- Load (drawn as part of the vehicle): an entire orbital rocket on a long cradle
- Equipment: twin steering axles and air horns
- Finish: heavy grime and chipped paint
- Tires: 2.89 m giant mining tires: enormous mining-truck tires taller than a person, deep chevron tread

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, side-on facing right, transparent
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
