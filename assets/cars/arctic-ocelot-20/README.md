# Arctic Ocelot 20

Status: **planned** · class `scout`, tier 20 of 20 · 4×4, 2 axles · 5.5 t empty · 380 kW · spiked tires, 1.6 m
Load: **Dynamite crates**, 0.5 t

## Art brief

- Vehicle: signal red 4×4 pickup scout with an open bed
- Load (drawn as part of the vehicle): red explosives crates with hazard stripes and a flag
- Equipment: roof rack with jerry cans and recovery boards
- Finish: mud-caked lower panels
- Tires: 1.60 m spiked studs: winter tires studded with rows of steel spikes

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, side-on facing right, transparent
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
