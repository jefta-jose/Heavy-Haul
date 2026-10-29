# Quarryman 13

Status: **planned** · class `heavy-duty`, tier 13 of 20 · 6×6, 3 axles · 17.2 t empty · 398 kW · mud-terrain tires, 1.28 m
Load: **Precast walls**, 18 t

## Art brief

- Vehicle: forest green heavy-duty work truck
- Load (drawn as part of the vehicle): precast concrete wall panels on an A-frame
- Equipment: steel dump body and mud flaps
- Finish: work-worn paint and dried mud
- Tires: 1.28 m mud-terrain: deep chunky mud lugs with open voids

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, facing right, transparent, as a **strictly flat side profile** (the hard rule in AGENTS.md: no perspective, all tires the same size on one level line, no far-side tires)
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
