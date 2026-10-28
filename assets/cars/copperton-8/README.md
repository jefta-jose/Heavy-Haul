# Copperton 8

Status: **planned** · class `heavy-duty`, tier 8 of 20 · 6×4, 3 axles · 14 t empty · 341 kW · mud-terrain tires, 1.22 m
Load: **Utility poles**, 12 t

## Art brief

- Vehicle: safety orange heavy-duty work truck
- Load (drawn as part of the vehicle): a stack of wooden utility poles
- Equipment: folded knuckle crane
- Finish: work-worn paint and dried mud
- Tires: 1.22 m mud-terrain: deep chunky mud lugs with open voids

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, side-on facing right, transparent
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
