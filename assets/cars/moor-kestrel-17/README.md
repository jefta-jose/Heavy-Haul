# Moor Kestrel 17

Status: **planned** · class `scout`, tier 17 of 20 · 4×4, 2 axles · 4.9 t empty · 338 kW · spiked tires, 1.49 m
Load: **Medical supplies**, 0.5 t

## Art brief

- Vehicle: mustard yellow 4×4 pickup scout with an open bed
- Load (drawn as part of the vehicle): white crates with red crosses under a tarp
- Equipment: side shovel and hi-lift jack
- Finish: mud-caked lower panels
- Tires: 1.49 m spiked studs: winter tires studded with rows of steel spikes

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, side-on facing right, transparent
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
