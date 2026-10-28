# Outback Dingo 15

Status: **planned** · class `scout`, tier 15 of 20 · 4×4, 2 axles · 4.5 t empty · 311 kW · chained tires, 1.38 m
Load: **Chicken crates**, 0.3 t

## Art brief

- Vehicle: chrome silver 4×4 pickup scout with an open bed
- Load (drawn as part of the vehicle): stacked wire crates of white chickens
- Equipment: snorkel and steel bumper with winch
- Finish: mud-caked lower panels
- Tires: 1.38 m snow chains: mud-terrain tires wrapped in heavy steel snow chains

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, side-on facing right, transparent
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
