# Mammoth 4

Status: **planned** · class `heavy`, tier 4 of 20 · 6×4, 3 axles · 29.2 t empty · 573 kW · chained tires, 1.52 m
Load: **Boulder**, 50 t

## Art brief

- Vehicle: olive heavy-haul prime mover with a multi-axle lowbed
- Load (drawn as part of the vehicle): one enormous granite boulder chained to a frame
- Equipment: ladder to a high cab and huge mirrors
- Finish: heavy grime and chipped paint
- Tires: 1.52 m off-road mud-terrain tires wrapped in heavy steel twin-ring tractor chains

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, facing right, transparent, as a **strictly flat side profile** (the hard rule in AGENTS.md: no perspective, all tires the same size on one level line, no far-side tires)
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
