# Mire King 6

Status: **planned** · class `offroad`, tier 6 of 20 · 6×6, 3 axles · 12.5 t empty · 331 kW · mud-terrain tires, 1.51 m
Load: **Elephant**, 5.5 t

## Art brief

- Vehicle: cobalt blue all-terrain 6×6 cargo truck
- Load (drawn as part of the vehicle): a calm grey elephant in a high open-top crate
- Equipment: expedition box with ladders and lights
- Finish: thick dried mud
- Tires: 1.51 m mud-terrain: deep chunky mud lugs with open voids

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, side-on facing right, transparent
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
