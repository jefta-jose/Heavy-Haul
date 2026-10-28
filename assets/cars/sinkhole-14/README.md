# Sinkhole 14

Status: **planned** · class `offroad`, tier 14 of 20 · 8×8, 4 axles · 18.9 t empty · 462 kW · chained tires, 1.81 m
Load: **Cattle**, 8 t

## Art brief

- Vehicle: rust red all-terrain 6×6 cargo truck
- Load (drawn as part of the vehicle): cows behind tall livestock rails
- Equipment: snorkel and wading kit
- Finish: thick dried mud
- Tires: 1.81 m snow chains: mud-terrain tires wrapped in heavy steel snow chains

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, side-on facing right, transparent
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
