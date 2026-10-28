# Coastline 12

Status: **planned** · class `highway`, tier 12 of 20 · 6×2, 3 axles · 11.9 t empty · 393 kW · all-terrain tires, 1.13 m
Load: **Brick pallets**, 20 t

## Art brief

- Vehicle: chrome silver highway tractor with its semi-trailer
- Load (drawn as part of the vehicle): a flatbed semi-trailer of shrink-wrapped brick pallets
- Equipment: polished fuel tanks
- Finish: polished paint with road dust
- Tires: 1.13 m all-terrain: blocky all-terrain tread with sipes

## Codex delivers (see AGENTS.md)

- [ ] `source/vehicle-master-v1.png`: the complete vehicle **with its load**, all wheels on, side-on facing right, transparent
- [ ] `source/body-v1.png`: the same canvas with every road wheel removed (the load stays)
- [ ] `source/wheel-v1.png`: one matching tire on a square transparent canvas, hub centred
- [ ] `source/prompts.json`: the exact prompts and which image was an edit target

## Claude hooks it up (see CLAUDE.md)

`art/*.webp`, `car.json` (registration, physics with the load's mass, drivetrain) and `status: "playable"`.
