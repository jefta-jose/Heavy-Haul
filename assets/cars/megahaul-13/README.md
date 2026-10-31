# Megahaul 13

Status: **planned** · class `heavy`, tier 13 of 20 · 8×8, 4 axles · 62.2 t empty · 1094 kW · chained tires, 2.44 m
Load: **Transformer**, 90 t

## Art brief

- Vehicle: teal heavy-haul prime mover with a multi-axle lowbed
- Load (drawn as part of the vehicle): a grey power transformer with porcelain bushings
- Equipment: roll cage, beacons and a giant bull bar
- Finish: heavy grime and chipped paint
- Tires: 2.44 m off-road mud-terrain tires wrapped in heavy steel diamond-pattern chains

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, facing right, transparent, as a **strictly flat side profile** (the hard rule in AGENTS.md: no perspective, all tires the same size on one level line, no far-side tires)
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
