# Juggernaut 7

Status: **planned** · class `heavy`, tier 7 of 20 · 8×4, 4 axles · 39.7 t empty · 747 kW · all-terrain tires, 1.87 m
Load: **Ship propeller**, 25 t

## Art brief

- Vehicle: teal heavy-haul prime mover with a multi-axle lowbed
- Load (drawn as part of the vehicle): a giant bronze ship propeller standing in a frame
- Equipment: ballast box and oversize-load banners
- Finish: heavy grime and chipped paint
- Tires: 1.87 m all-terrain: blocky all-terrain tread with sipes

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, side-on facing right, transparent
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
