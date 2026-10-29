# Monolith 11

Status: **planned** · class `heavy`, tier 11 of 20 · 8×8, 4 axles · 54.6 t empty · 978 kW · chained tires, 2.21 m
Load: **Luxury yacht**, 30 t

## Art brief

- Vehicle: cobalt blue heavy-haul prime mover with a multi-axle lowbed
- Load (drawn as part of the vehicle): a sleek white yacht on cradles
- Equipment: escort light bar and amber beacons
- Finish: heavy grime and chipped paint
- Tires: 2.21 m snow chains: mud-terrain tires wrapped in heavy steel snow chains

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, facing right, transparent, as a **strictly flat side profile** (the hard rule in AGENTS.md: no perspective, all tires the same size on one level line, no far-side tires)
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
