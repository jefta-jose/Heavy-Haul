# Gully Goat 7

Status: **planned** · class `offroad`, tier 7 of 20 · 6×6, 3 axles · 13.2 t empty · 347 kW · flotation tires, 1.51 m
Load: **Giraffe**, 1.5 t

## Art brief

- Vehicle: teal all-terrain 6×6 cargo truck
- Load (drawn as part of the vehicle): a giraffe whose long neck sticks out of a tall open crate
- Equipment: canvas cargo bed with bows
- Finish: thick dried mud
- Tires: 1.51 m flotation: huge low-pressure balloon tires with wide paddle lugs

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, facing right, transparent, as a **strictly flat side profile** (the hard rule in AGENTS.md: no perspective, all tires the same size on one level line, no far-side tires)
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
