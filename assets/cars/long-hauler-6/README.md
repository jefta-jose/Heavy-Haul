# Long Hauler 6

Status: **planned** · class `highway`, tier 6 of 20 · 4×2, 2 axles · 9.1 t empty · 298 kW · road tires, 1.04 m
Load: **Steel coils**, 14 t

## Art brief

- Vehicle: cobalt blue highway tractor with its semi-trailer
- Load (drawn as part of the vehicle): a flatbed semi-trailer with three steel coils on chocks
- Equipment: chrome bull bar and air horns
- Finish: polished paint with road dust
- Tires: 1.04 m road tires: smooth highway rib tread, chrome or painted hubs

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, facing right, transparent, as a **strictly flat side profile** (the hard rule in AGENTS.md: no perspective, all tires the same size on one level line, no far-side tires)
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
