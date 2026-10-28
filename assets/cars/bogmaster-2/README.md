# Bogmaster 2

Status: **planned** · class `offroad`, tier 2 of 20 · 6×6, 3 axles · 9.6 t empty · 266 kW · mud-terrain tires, 1.35 m
Load: **Drill rig kit**, 7 t

## Art brief

- Vehicle: chrome silver all-terrain 6×6 cargo truck
- Load (drawn as part of the vehicle): a folded water-drilling rig
- Equipment: canvas cargo bed with bows
- Finish: thick dried mud
- Tires: 1.35 m mud-terrain: deep chunky mud lugs with open voids

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, side-on facing right, transparent
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
