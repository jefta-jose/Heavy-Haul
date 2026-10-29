# Asphalt King 3

Status: **planned** · class `highway`, tier 3 of 20 · 4×2, 2 axles · 7.8 t empty · 251 kW · road tires, 1.05 m
Load: **Pipe bundles**, 9 t

## Art brief

- Vehicle: olive highway tractor with its semi-trailer
- Load (drawn as part of the vehicle): a flatbed semi-trailer with banded steel pipes
- Equipment: chrome bull bar and air horns
- Finish: polished paint with road dust
- Tires: 1.05 m road tires: smooth highway rib tread, chrome or painted hubs

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, facing right, transparent, as a **strictly flat side profile** (the hard rule in AGENTS.md: no perspective, all tires the same size on one level line, no far-side tires)
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
