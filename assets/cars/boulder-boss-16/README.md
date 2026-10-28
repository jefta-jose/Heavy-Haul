# Boulder Boss 16

Status: **planned** · class `heavy-duty`, tier 16 of 20 · 6×6, 3 axles · 19.3 t empty · 433 kW · chained tires, 1.33 m
Load: **Steel girders**, 20 t

## Art brief

- Vehicle: racing green heavy-duty work truck
- Load (drawn as part of the vehicle): painted steel bridge girders
- Equipment: rotating mixer drum
- Finish: work-worn paint and dried mud
- Tires: 1.33 m snow chains: mud-terrain tires wrapped in heavy steel snow chains

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, side-on facing right, transparent
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
