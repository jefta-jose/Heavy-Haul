# Delta Heron 12

Status: **planned** · class `scout`, tier 12 of 20 · 4×4, 2 axles · 3.9 t empty · 270 kW · mud-terrain tires, 1.3 m
Load: **Generator**, 1.2 t

## Art brief

- Vehicle: olive 4×4 pickup scout with an open bed
- Load (drawn as part of the vehicle): a yellow skid-mounted diesel generator
- Equipment: rear spare carrier and ladder
- Finish: mud-caked lower panels
- Tires: 1.30 m mud-terrain: deep chunky mud lugs with open voids

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, side-on facing right, transparent
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
