# Wetland Titan 13

Status: **planned** · class `offroad`, tier 13 of 20 · 6×6, 3 axles · 18 t empty · 445 kW · chained tires, 1.75 m
Load: **Broken-down 6×6**, 14 t

## Art brief

- Vehicle: sand beige all-terrain 6×6 cargo truck
- Load (drawn as part of the vehicle): a broken-down 6×6 truck on a recovery deck
- Equipment: snorkel and wading kit
- Finish: thick dried mud
- Tires: 1.75 m snow chains: mud-terrain tires wrapped in heavy steel snow chains

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, side-on facing right, transparent
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
