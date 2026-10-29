# Colossus 5

Status: **planned** · class `heavy`, tier 5 of 20 · 6×4, 3 axles · 32.6 t empty · 631 kW · all-terrain tires, 1.61 m
Load: **Bridge beams**, 55 t

## Art brief

- Vehicle: teal heavy-haul prime mover with a multi-axle lowbed
- Load (drawn as part of the vehicle): three precast bridge beams
- Equipment: ladder to a high cab and huge mirrors
- Finish: heavy grime and chipped paint
- Tires: 1.61 m all-terrain: blocky all-terrain tread with sipes

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, facing right, transparent, as a **strictly flat side profile** (the hard rule in AGENTS.md: no perspective, all tires the same size on one level line, no far-side tires)
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
