# Basalt 12

Status: **planned** · class `heavy`, tier 12 of 20 · 8×8, 4 axles · 58.4 t empty · 1036 kW · chained tires, 2.36 m
Load: **Ship hull section**, 60 t

## Art brief

- Vehicle: mustard yellow heavy-haul prime mover with a multi-axle lowbed
- Load (drawn as part of the vehicle): a rust-red ship hull block with weld seams
- Equipment: ladder to a high cab and huge mirrors
- Finish: heavy grime and chipped paint
- Tires: 2.36 m off-road mud-terrain tires wrapped in heavy steel ladder chains (straight cross links)

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, facing right, transparent, as a **strictly flat side profile** (the hard rule in AGENTS.md: no perspective, all tires the same size on one level line, no far-side tires)
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
