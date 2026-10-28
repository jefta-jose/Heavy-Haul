# Prime Mover 1

Status: **planned** · class `heavy`, tier 1 of 20 · 6×4, 3 axles · 20 t empty · 400 kW · road tires, 1.2 m
Load: **Excavator**, 35 t

## Art brief

- Vehicle: gunmetal grey heavy-haul prime mover with a multi-axle lowbed
- Load (drawn as part of the vehicle): a yellow tracked excavator
- Equipment: hydraulic gooseneck hitch
- Finish: heavy grime and chipped paint
- Tires: 1.20 m road tires: smooth highway rib tread, chrome or painted hubs

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, side-on facing right, transparent
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
