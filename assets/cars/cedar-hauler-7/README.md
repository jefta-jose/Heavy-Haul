# Cedar Hauler 7

Status: **planned** · class `heavy-duty`, tier 7 of 20 · 6×4, 3 axles · 13.4 t empty · 329 kW · mud-terrain tires, 1.19 m
Load: **Long logs**, 16 t

## Art brief

- Vehicle: olive heavy-duty work truck
- Load (drawn as part of the vehicle): 16 m logs on bunks with a logging trailer
- Equipment: rotating mixer drum
- Finish: work-worn paint and dried mud
- Tires: 1.19 m mud-terrain: deep chunky mud lugs with open voids

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, side-on facing right, transparent
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
