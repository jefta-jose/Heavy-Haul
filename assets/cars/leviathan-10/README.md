# Leviathan 10

Status: **planned** · class `heavy`, tier 10 of 20 · 8×4, 4 axles · 50.8 t empty · 921 kW · chained tires, 2.16 m
Load: **Fishing trawler**, 45 t

## Art brief

- Vehicle: forest green heavy-haul prime mover with a multi-axle lowbed
- Load (drawn as part of the vehicle): a blue fishing trawler on cradles
- Equipment: escort light bar and amber beacons
- Finish: heavy grime and chipped paint
- Tires: 2.16 m snow chains: mud-terrain tires wrapped in heavy steel snow chains

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, side-on facing right, transparent
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
