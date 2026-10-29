# Permafrost 16

Status: **planned** · class `offroad`, tier 16 of 20 · 8×8, 4 axles · 20.6 t empty · 494 kW · chained tires, 1.85 m
Load: **Ice blocks**, 10 t

## Art brief

- Vehicle: arctic white all-terrain 6×6 cargo truck
- Load (drawn as part of the vehicle): clear blue ice blocks in an insulated open box
- Equipment: snorkel and wading kit
- Finish: thick dried mud
- Tires: 1.85 m snow chains: mud-terrain tires wrapped in heavy steel snow chains

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, facing right, transparent, as a **strictly flat side profile** (the hard rule in AGENTS.md: no perspective, all tires the same size on one level line, no far-side tires)
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
