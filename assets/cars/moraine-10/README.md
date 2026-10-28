# Moraine 10

Status: **planned** · class `offroad`, tier 10 of 20 · 6×6, 3 axles · 15.6 t empty · 396 kW · flotation tires, 1.62 m
Load: **Ore sacks**, 11 t

## Art brief

- Vehicle: safety orange all-terrain 6×6 cargo truck
- Load (drawn as part of the vehicle): heavy ore sacks
- Equipment: expedition box with ladders and lights
- Finish: thick dried mud
- Tires: 1.62 m flotation: huge low-pressure balloon tires with wide paddle lugs

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, side-on facing right, transparent
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
