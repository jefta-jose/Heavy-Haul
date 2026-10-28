# Tundra Mule 15

Status: **planned** · class `offroad`, tier 15 of 20 · 8×8, 4 axles · 19.7 t empty · 478 kW · chained tires, 1.78 m
Load: **Drilling mast**, 15 t

## Art brief

- Vehicle: burnt orange all-terrain 6×6 cargo truck
- Load (drawn as part of the vehicle): a red lattice drilling mast lying flat
- Equipment: crane boom and recovery spades
- Finish: thick dried mud
- Tires: 1.78 m snow chains: mud-terrain tires wrapped in heavy steel snow chains

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, side-on facing right, transparent
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
