# Timberjack 14

Status: **planned** · class `heavy-duty`, tier 14 of 20 · 6×6, 3 axles · 17.9 t empty · 410 kW · chained tires, 1.3 m
Load: **Boulders**, 20 t

## Art brief

- Vehicle: arctic white heavy-duty work truck
- Load (drawn as part of the vehicle): a dump body heaped with big granite boulders
- Equipment: steel dump body and mud flaps
- Finish: work-worn paint and dried mud
- Tires: 1.30 m snow chains: mud-terrain tires wrapped in heavy steel snow chains

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, side-on facing right, transparent
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
