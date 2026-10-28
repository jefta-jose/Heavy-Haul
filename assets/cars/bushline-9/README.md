# Bushline 9

Status: **planned** · class `heavy-duty`, tier 9 of 20 · 6×4, 3 axles · 14.6 t empty · 352 kW · mud-terrain tires, 1.25 m
Load: **Copper cable drum**, 15 t

## Art brief

- Vehicle: olive heavy-duty work truck
- Load (drawn as part of the vehicle): a giant drum of copper power cable
- Equipment: rotating mixer drum
- Finish: work-worn paint and dried mud
- Tires: 1.25 m mud-terrain: deep chunky mud lugs with open voids

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, side-on facing right, transparent
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
