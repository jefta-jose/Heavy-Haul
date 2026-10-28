# Freeway Flyer 2

Status: **planned** · class `highway`, tier 2 of 20 · 4×2, 2 axles · 7.4 t empty · 235 kW · road tires, 1 m
Load: **Hay trailer**, 7 t

## Art brief

- Vehicle: olive highway tractor with its semi-trailer
- Load (drawn as part of the vehicle): a flatbed semi-trailer stacked with square hay bales
- Equipment: polished fuel tanks
- Finish: polished paint with road dust
- Tires: 1.00 m road tires: smooth highway rib tread, chrome or painted hubs

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, side-on facing right, transparent
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
