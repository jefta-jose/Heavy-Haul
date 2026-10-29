# Forester 1

Status: **planned** · class `heavy-duty`, tier 1 of 20 · 6×4, 3 axles · 10 t empty · 260 kW · all-terrain tires, 1.07 m
Load: **Gravel**, 8 t

## Art brief

- Vehicle: rust red heavy-duty work truck
- Load (drawn as part of the vehicle): a steel dump body heaped with gravel
- Equipment: folded knuckle crane
- Finish: work-worn paint and dried mud
- Tires: 1.07 m all-terrain: blocky all-terrain tread with sipes

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, facing right, transparent, as a **strictly flat side profile** (the hard rule in AGENTS.md: no perspective, all tires the same size on one level line, no far-side tires)
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
