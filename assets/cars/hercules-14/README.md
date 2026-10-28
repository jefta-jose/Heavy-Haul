# Hercules 14

Status: **planned** · class `heavy`, tier 14 of 20 · 8×8, 4 axles · 66.1 t empty · 1152 kW · giant tires, 2.56 m
Load: **Rocket stage**, 30 t

## Art brief

- Vehicle: signal red heavy-haul prime mover with a multi-axle lowbed
- Load (drawn as part of the vehicle): a white rocket stage on a cradle
- Equipment: roll cage, beacons and a giant bull bar
- Finish: heavy grime and chipped paint
- Tires: 2.56 m giant mining tires: enormous mining-truck tires taller than a person, deep chevron tread

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, side-on facing right, transparent
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
