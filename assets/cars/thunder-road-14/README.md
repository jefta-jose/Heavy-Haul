# Thunder Road 14

Status: **planned** · class `highway`, tier 14 of 20 · 6×4, 3 axles · 12.9 t empty · 425 kW · all-terrain tires, 1.14 m
Load: **Double container**, 24 t

## Art brief

- Vehicle: arctic white highway tractor with its semi-trailer
- Load (drawn as part of the vehicle): two 20 ft containers on a skeletal trailer
- Equipment: aero roof fairing and side skirts
- Finish: polished paint with road dust
- Tires: 1.14 m all-terrain: blocky all-terrain tread with sipes

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, facing right, transparent, as a **strictly flat side profile** (the hard rule in AGENTS.md: no perspective, all tires the same size on one level line, no far-side tires)
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
