# Behemoth 9

Status: **planned** · class `heavy`, tier 9 of 20 · 8×4, 4 axles · 47 t empty · 863 kW · all-terrain tires, 2.03 m
Load: **Diesel locomotive**, 90 t

## Art brief

- Vehicle: mustard yellow heavy-haul prime mover with a multi-axle lowbed
- Load (drawn as part of the vehicle): a green-and-yellow diesel locomotive
- Equipment: ladder to a high cab and huge mirrors
- Finish: heavy grime and chipped paint
- Tires: 2.03 m all-terrain: blocky all-terrain tread with sipes

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, side-on facing right, transparent
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
