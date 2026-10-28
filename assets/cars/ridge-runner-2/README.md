# Ridge Runner 2

Status: **planned** · class `scout`, tier 2 of 20 · 4×4, 2 axles · 2.1 t empty · 133 kW · all-terrain tires, 0.89 m
Load: **Firewood**, 0.3 t

## Art brief

- Vehicle: gunmetal grey 4×4 pickup scout with an open bed
- Load (drawn as part of the vehicle): split firewood stacked in the bed
- Equipment: light bar and roof tent
- Finish: mud-caked lower panels
- Tires: 0.89 m all-terrain: blocky all-terrain tread with sipes

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, side-on facing right, transparent
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
