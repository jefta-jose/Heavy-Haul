# Bedrock 15

Status: **planned** · class `heavy-duty`, tier 15 of 20 · 6×6, 3 axles · 18.6 t empty · 422 kW · chained tires, 1.35 m
Load: **Drill pipes**, 16 t

## Art brief

- Vehicle: signal red heavy-duty work truck
- Load (drawn as part of the vehicle): racked drill pipes
- Equipment: folded knuckle crane
- Finish: work-worn paint and dried mud
- Tires: 1.35 m snow chains: mud-terrain tires wrapped in heavy steel snow chains

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, side-on facing right, transparent
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
