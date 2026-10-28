# Glacier Hare 19

Status: **planned** · class `scout`, tier 19 of 20 · 4×4, 2 axles · 5.3 t empty · 366 kW · spiked tires, 1.53 m
Load: **Campaign speakers**, 0.8 t

## Art brief

- Vehicle: olive 4×4 pickup scout with an open bed
- Load (drawn as part of the vehicle): loudspeaker stacks and bright campaign banners
- Equipment: roof rack with jerry cans and recovery boards
- Finish: mud-caked lower panels
- Tires: 1.53 m spiked studs: winter tires studded with rows of steel spikes

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, side-on facing right, transparent
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
