# Whiteout 17

Status: **planned** · class `offroad`, tier 17 of 20 · 8×8, 4 axles · 21.4 t empty · 511 kW · spiked tires, 1.91 m
Load: **Dinosaur skeleton**, 8 t

## Art brief

- Vehicle: sand beige all-terrain 6×6 cargo truck
- Load (drawn as part of the vehicle): a mounted T-rex skeleton on a museum frame
- Equipment: expedition box with ladders and lights
- Finish: thick dried mud
- Tires: 1.91 m spiked tires: off-road mud-terrain tires studded with rows of short steel spikes

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, facing right, transparent, as a **strictly flat side profile** (the hard rule in AGENTS.md: no perspective, all tires the same size on one level line, no far-side tires)
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
