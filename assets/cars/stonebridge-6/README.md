# Stonebridge 6

Status: **planned** · class `heavy-duty`, tier 6 of 20 · 6×4, 3 axles · 12.8 t empty · 317 kW · all-terrain tires, 1.21 m
Load: **Bricks**, 11 t

## Art brief

- Vehicle: racing green heavy-duty work truck
- Load (drawn as part of the vehicle): brick pallets on a crane flatbed
- Equipment: folded knuckle crane
- Finish: work-worn paint and dried mud
- Tires: 1.21 m all-terrain: blocky all-terrain tread with sipes

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, side-on facing right, transparent
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
