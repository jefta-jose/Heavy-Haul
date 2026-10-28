# Taiga Marten 13

Status: **planned** · class `scout`, tier 13 of 20 · 4×4, 2 axles · 4.1 t empty · 284 kW · chained tires, 1.33 m
Load: **Calves**, 0.6 t

## Art brief

- Vehicle: safety orange 4×4 pickup scout with an open bed
- Load (drawn as part of the vehicle): two brown-and-white calves behind wooden side rails
- Equipment: roof rack with jerry cans and recovery boards
- Finish: mud-caked lower panels
- Tires: 1.33 m snow chains: mud-terrain tires wrapped in heavy steel snow chains

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, side-on facing right, transparent
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
