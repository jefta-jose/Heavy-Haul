# Glacier Ram 20

Status: **planned** · class `offroad`, tier 20 of 20 · 8×8, 4 axles · 24 t empty · 560 kW · spiked tires, 2.01 m
Load: **Rocket engine**, 18 t

## Art brief

- Vehicle: cobalt blue all-terrain 6×6 cargo truck
- Load (drawn as part of the vehicle): a huge rocket engine on a test-stand frame
- Equipment: expedition box with ladders and lights
- Finish: thick dried mud
- Tires: 2.01 m spiked studs: winter tires studded with rows of steel spikes

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, side-on facing right, transparent
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
