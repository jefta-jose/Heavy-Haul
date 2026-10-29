# Rockhopper 4

Status: **planned** · class `offroad`, tier 4 of 20 · 6×6, 3 axles · 11 t empty · 298 kW · mud-terrain tires, 1.43 m
Load: **Aid supplies**, 6 t

## Art brief

- Vehicle: mustard yellow all-terrain 6×6 cargo truck
- Load (drawn as part of the vehicle): pallets of aid sacks under netting
- Equipment: crane boom and recovery spades
- Finish: thick dried mud
- Tires: 1.43 m mud-terrain: deep chunky mud lugs with open voids

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, facing right, transparent, as a **strictly flat side profile** (the hard rule in AGENTS.md: no perspective, all tires the same size on one level line, no far-side tires)
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
