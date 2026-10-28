# Timber Wolf 7

Status: **planned** · class `scout`, tier 7 of 20 · 4×4, 2 axles · 3 t empty · 202 kW · mud-terrain tires, 1.06 m
Load: **Hay bales**, 0.5 t

## Art brief

- Vehicle: olive 4×4 pickup scout with an open bed
- Load (drawn as part of the vehicle): two round hay bales wrapped in green film
- Equipment: roof rack with jerry cans and recovery boards
- Finish: mud-caked lower panels
- Tires: 1.06 m mud-terrain: deep chunky mud lugs with open voids

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, side-on facing right, transparent
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
